import net from 'net'
import { createLogger } from '@generates/logger'
import WebSocket from 'ws'
import { nanoid } from 'nanoid'
import { stripIndent } from 'common-tags'

const logger = createLogger({ level: 'debug', namespace: 'kdot-port-reverse' })
const server = net.createServer()

//
const connections = {}

//
const port = process.env.TUNNEL_PORT || '28199'
const wss = new WebSocket.Server({ port })

//
let ws
wss.on('connection', websocket => {
  logger.info('Websocket connection on port', port)
  ws = websocket

  ws.on('message', message => {
    const { id, data, isEnd } = JSON.parse(message)
    logger.debug('Client message', { id, isEnd })

    //
    const socket = connections[id]
    if (socket) {
      if (isEnd) {
        logger.debug('Ending connection:', id)
        socket.end()
        delete connections[id]
      } else {
        logger.debug('Relaying data for connection:', id)
        socket.write(Buffer.from(data))
      }
    } else {
      logger.warn('Received data or unknown connection:', id)
    }
  })
})

server.on('connection', socket => {
  // Create a unique ID for the connection.
  const id = nanoid()
  logger.info(`Connection ${id}`)

  // Store the socket so it can be retrieved when theres a response through the
  // websocket.
  if (ws) connections[id] = socket

  // const data = []
  socket.on('data', requestData => {
    const length = requestData?.length
    const isLoggable = length && (length <= 2048)
    const info = { id, data: isLoggable ? requestData.toString() : length }
    logger.debug('Request data', info)

    if (ws) {
      ws.send(JSON.stringify({ id, data: requestData }))
    } else {
      const message = 'Server connection with no client websocket connection'
      logger.warn(message, { id })

      const buf = Buffer.from(message, 'utf8')
      socket.write(stripIndent`
        HTTP/1.1 500 Internal Server Error
        Accept-Ranges: bytes
        Content-Length: ${buf.length}
        Connection: close
        Content-Type: text/plain

        ${buf}
      `)
      socket.end()
    }
  })

  socket.on('end', () => {
    //
    if (ws) {
      logger.warn('Requester ended connection', id)
      ws.send(JSON.stringify({ id, isEnd: true }))
    }

    //
    delete connections[id]
  })
})

server.listen(process.env.PORT, () => {
  logger.info('kdot-port-reverse started', {
    port: process.env.PORT,
    tunnelPort: port
  })
})
