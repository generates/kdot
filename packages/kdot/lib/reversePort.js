import net from 'net'
import { createLogger } from '@generates/logger'
import WebSocket from 'ws'

const logger = createLogger({ level: 'info', namespace: 'kdot.fwd' })

export default function reversePort (config) {
  const { kprPort = 28199, app } = config

  //
  const url = `ws://localhost:${kprPort}/`
  logger.info('Attempting reverse port websocket connection:', url)
  const ws = new WebSocket(url)

  //
  const connections = {}

  //
  ws.on('message', message => {
    const { id, isEnd, data } = JSON.parse(message)
    logger.debug('Port reverse message', { app, id, isEnd })

    //
    const conn = connections[id]

    if (isEnd) {
      const info = { app, id }
      if (conn) {
        logger.debug('Connection end', info)

        //
        conn.end()

        //
        delete connections[id]
      } else {
        logger.warn('Received connection end for unknown connection', info)
      }
    } else if (conn) {
      //
      conn.write(Buffer.from(data))
    } else {
      //
      const conn = net.createConnection({ port: config.reversePort }, () => {
        logger.debug('Connected to server', { app, id })

        // Forward the data received from KPR to the local server.
        conn.write(Buffer.from(data), err => {
          logger.debug('Server request', { app, id })
          if (err) {
            logger.error('Server request error', { app, id }, '\n', err)
            ws.send(JSON.stringify({ id, isEnd: true }))
          }
        })

        // Pass data returned by the local server to KPR.
        conn.on('data', data => {
          logger.debug('Server response data', { app, id })
          ws.send(JSON.stringify({ id, data }))
        })

        // When the local server closes the connection, tell KPR to close it's
        // connection to the requesting client.
        conn.on('end', () => {
          logger.debug('Server response end', { app, id })
          ws.send(JSON.stringify({ id, isEnd: true }))

          //
          delete connections[id]
        })
      })

      //
      connections[id] = conn
    }
  })
}
