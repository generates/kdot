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
const wss = new WebSocket.Server({ server })

//
let ws
wss.on('connection', websocket => (ws = websocket))

ws.on('data', message => {
  const socket = connections[message.id]
  if (socket) {
    if (message.end) {
      logger.debug()
      socket.end()
      delete connections[message.id]
    } else {
      logger.debug()
      socket.write(message.data)
    }
  } else {
    logger.warn()
  }
})

server.on('connection', socket => {
  // Create a unique ID for the connection.
  const id = nanoid()
  logger.debug(`Connection ${id}`)

  // Store the socket so it can be retrieved when theres a response through the
  // websocket.
  connections[id] = socket

  // const data = []
  socket.on('data', requestData => {
    const length = requestData?.length
    const isLoggable = length && (length <= 2048)
    const info = { id, data: isLoggable ? requestData.toString() : length }
    logger.debug('Request data', info)

    if (ws) {
      ws.send({ id, data: requestData })
    } else {
      const message = 'Server connection with no client websocket connection'
      logger.debug(message, { id })

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
    delete connections[id]
  })
})

server.listen(3000)
