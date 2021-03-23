import net from 'net'
import { createLogger } from '@generates/logger'
import WebSocket from 'ws'

const logger = createLogger({ level: 'info', namespace: 'kdot.fwd' })

export default function reversePort (config) {
  const { kprPort = 28199, app } = config

  // Create a websocket connection the the kdot-port-reverse server running in
  // the cluster.
  const url = `ws://localhost:${kprPort}/`
  logger.info('Attempting reverse port websocket connection:', url)
  const ws = new WebSocket(url)

  // Store connections to the local server so that subsequent messages can be
  // routed to them.
  const connections = {}

  // Listen for messages from the kdot-port-reverse server.
  ws.on('message', message => {
    const { id, event, data } = JSON.parse(message)
    logger.debug('Port reverse message', { app, id, event })

    // Retrieve the connection from the store by ID if it exists.
    const conn = connections[id]
    const info = { app, id }

    if (conn && event === 'end') {
      //
      logger.debug('Reqeuster data end', info)

      //
      conn.end()
    } else if (conn && event === 'close') {
      // The server has indicated that the connection has been closed by the
      // requester.
      logger.debug('Requester connection closed', info)

      // Remove the connection from the store.
      delete connections[id]

      // Close the connection to the local server.
      conn.close()
    } else if (conn && event === 'data') {
      // Relay data to the local server over the existing connection.
      conn.write(Buffer.from(data))
    } else if (event === 'data') {
      // Create a new connection to the local server so that the request from
      // the cluster can be relayed to it.
      const conn = net.createConnection({ port: config.reversePort }, () => {
        logger.debug('Connected to server', { app, id })

        // Forward the data received from kdot-port-reverse to the local server.
        conn.write(Buffer.from(data), err => {
          logger.debug('Server request', { app, id })
          if (err) {
            logger.error('Server request error', { app, id }, '\n', err)
            ws.send(JSON.stringify({ id, event: 'close', err: err.message }))
          }
        })

        // Pass data returned by the local server to kdot-port-reverse.
        conn.on('data', data => {
          logger.debug('Server response data', { app, id })
          ws.send(JSON.stringify({ id, event: 'data', data }))
        })

        //
        conn.on('end', () => {
          logger.debug('Server data end', { app, id })
          ws.send(JSON.stringify({ id, event: 'end' }))
        })

        conn.on('close', () => {
          if (connections[id]) {
            // When the local server closes the connection, tell
            // kdot-port-reverse to close it's connection to the requesting
            // client.
            logger.debug('Server response close', { app, id })
            ws.send(JSON.stringify({ id, event: 'close' }))

            // Remove the connection from the store.
            delete connections[id]
          }
        })
      })

      // Store the new connection by it's ID.
      connections[id] = conn
    }
  })
}
