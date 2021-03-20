import net from 'net'
import { createLogger } from '@generates/logger'
import WebSocket from 'ws'
import { nanoid } from 'nanoid'
import { stripIndent } from 'common-tags'

const logger = createLogger({ level: 'debug', namespace: 'kdot-port-reverse' })
const server = net.createServer()

//
const wss = new WebSocket.Server({ server })

//
let ws
wss.on('connection', websocket => (ws = websocket))

server.on('connection', socket => {
  const id = nanoid()
  logger.debug(`Connection ${id}`)

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

  socket.on('end', () => ws.end())
})

server.listen(3000)
