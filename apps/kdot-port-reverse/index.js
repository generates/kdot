import net from 'net'
import { createLogger } from '@generates/logger'
import WebSocket from 'ws'
import { nanoid } from 'nanoid'
import { stripIndent } from 'common-tags'

const logger = createLogger({ level: 'debug', namespace: 'kdot-port-reverse' })

// Create a server that will listen for incoming HTTP requests that can be
// relayed to the client via websocket after which the client will relay to the
// local server.
const server = net.createServer()

// Keep track of connections by the ID thats generated on the initial
// connection.
const connections = {}

// Create a websocket server on the configured port so that the client can
// connect and communicate with this server.
const port = process.env.TUNNEL_PORT || '28199'
const wss = new WebSocket.Server({ port })

// Store the websocket connection when a connection is received so it can be
// used when receiving HTTP requests.
let ws
wss.on('connection', websocket => {
  logger.info('Websocket connection on port', port)
  ws = websocket

  ws.on('message', message => {
    const { id, data, isEnd } = JSON.parse(message)
    logger.debug('Client message', { id, isEnd })

    const socket = connections[id]
    if (socket) {
      if (isEnd) {
        // The client has indicated that the connection has ended.
        logger.debug('Ending connection:', id)

        // End the requester's connection.
        socket.end()

        // Remove the connection from the connection store.
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

  // Store the socket as a "connection" so it can be retrieved when theres a
  // response received through the websocket.
  if (ws) connections[id] = socket

  // Handle request data sent by the requester over the socket.
  socket.on('data', requestData => {
    const length = requestData?.length
    const isLoggable = length && (length <= 2048)
    const info = { id, data: isLoggable ? requestData.toString() : length }
    logger.debug('Request data', info)

    if (ws) {
      // If a websocket connection has been established, relay the request data
      // to the client.
      ws.send(JSON.stringify({ id, data: requestData }))
    } else {
      // If a websocket connection hasn't been established, return a response to
      // the requester explaining the situation.
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
    // If the requester has ended the connection, send a message to the client
    // so it can clean up the corresponding connection to the server if it has
    // established one.
    if (ws) {
      logger.warn('Requester ended connection', id)
      ws.send(JSON.stringify({ id, isEnd: true }))
    }

    // Remove the connection from the store.
    delete connections[id]
  })
})

// Listen on the configured port so that the server can receive HTTP requests.
server.listen(process.env.PORT, () => {
  logger.info('kdot-port-reverse started', {
    port: process.env.PORT,
    tunnelPort: port
  })
})
