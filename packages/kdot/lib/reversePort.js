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
    const { id, isEnd, data } = JSON.parse(message)
    logger.debug('Port reverse message', { app, id, isEnd })

    // Retrieve the connection from the store by ID if it exists.
    const conn = connections[id]

    if (isEnd) {
      const info = { app, id }
      if (conn) {
        // The server has indicated that the connection has ended.
        logger.debug('Connection end', info)

        // End the connection to the local server.
        conn.end()

        // Remove the connection from the store.
        delete connections[id]
      } else {
        logger.warn('Received connection end for unknown connection', info)
      }
    } else if (conn) {
      // Relay data to the local server over the existing connection.
      conn.write(Buffer.from(data))
    } else {
      // Create a new connection to the local server so that the request from
      // the cluster can be relayed to it.
      const conn = net.createConnection({ port: config.reversePort }, () => {
        logger.debug('Connected to server', { app, id })

        // Forward the data received from kdot-port-reverse to the local server.
        conn.write(Buffer.from(data), err => {
          logger.debug('Server request', { app, id })
          if (err) {
            logger.error('Server request error', { app, id }, '\n', err)
            ws.send(JSON.stringify({ id, isEnd: true }))
          }
        })

        // Pass data returned by the local server to kdot-port-reverse.
        conn.on('data', data => {
          logger.debug('Server response data', { app, id })
          ws.send(JSON.stringify({ id, data }))
        })

        // When the local server closes the connection, tell kdot-port-reverse
        // to close it's connection to the requesting client.
        conn.on('end', () => {
          logger.debug('Server response end', { app, id })
          ws.send(JSON.stringify({ id, isEnd: true }))

          // Remove the connection from the store.
          delete connections[id]
        })
      })

      // Store the new connection by it's ID.
      connections[id] = conn
    }
  })
}
