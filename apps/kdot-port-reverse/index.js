import net from 'net'
import { createLogger } from '@generates/logger'
import WebSocket from 'ws'
import { nanoid } from 'nanoid'
import { stripIndent } from 'common-tags'

const level = process.env.LOG_LEVEL || 'info'
const logger = createLogger({ level, namespace: 'kdot-port-reverse' })

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
    const { id, event, data, err } = JSON.parse(message)
    const info = { id, event, err }
    logger.debug('Client message', info)

    const socket = connections[id]
    if (socket) {
      if (event === 'end') {
        logger.debug('Server data end', info)

        //
        socket.end()
      } else if (event === 'close') {
        // The client has indicated that the connection has been closed.
        logger.debug('Closing requester connection', info)

        // Remove the connection from the connection store.
        delete connections[id]

        // Close the requester's connection.
        socket.destroy(err)
      } else {
        //
        logger.debug('Server data', info)
        socket.write(Buffer.from(data))
      }
    } else {
      logger.warn('Received event or unknown connection', info)
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
    let dataSlice
    if (level === 'debug') dataSlice = requestData.slice(0, 2048).toString()
    logger.debug('Request data', { id, dataSlice })

    if (ws) {
      // If a websocket connection has been established, relay the request data
      // to the client.
      ws.send(JSON.stringify({ id, event: 'data', data: requestData }))
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
      socket.destroy()
    }
  })

  //
  socket.on('end', () => {
    logger.debug('Requester data end:', id)
    ws.send(JSON.stringify({ id, event: 'end' }))
  })

  socket.on('close', hadError => {
    // If the requester has closed the connection, send a message to the client
    // so it can clean up the corresponding connection to the server if it has
    // established one.
    if (ws && connections[id]) {
      if (hadError) {
        logger.warn('Requester closed connection and had an error:', id)
      } else {
        logger.debug('Requester closed connection:', id)
      }
      ws.send(JSON.stringify({ id, event: 'close' }))
    }

    // Remove the connection from the store if it exists.
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
