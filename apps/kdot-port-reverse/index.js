import net from 'net'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import { createLogger } from '@generates/logger'

const logger = createLogger({ level: 'info', namespace: 'kdot.pr' })

const packageDefinition = protoLoader.loadSync(
  './tunnel.proto',
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  }
)
const { grpc_tunnel: tunnel } = grpc.loadPackageDefinition(packageDefinition)
const credentials = grpc.credentials.createInsecure()
const client = new tunnel.Tunnel('localhost:28688', credentials)
const stream = client.initTunnel()

//
stream.write({ port: 5000 })

stream.on('data', ({ requestId, data, shouldClose }) => {
  logger.debug('Request', { requestId })

  if (shouldClose) {
    logger.debug('Close request', { requestId })
    stream.write({ requestId, shouldClose })
  } else {
    const client = net.createConnection({ port: 9000 }, () => {
      logger.debug('Connected to server', { requestId })
      client.write(data, err => {
        logger.debug('Client write', { requestId })
        if (err) {
          logger.error('Client write error', requestId, err)
          stream.write({ requestId, hasErr: true })
        }
      })
    })

    client.on('data', async data => {
      logger.debug('Client data', { requestId })
      stream.write({ requestId, data })
    })

    client.on('end', () => {
      logger.debug('Client end', { requestId })
      stream.write({ requestId, shouldClose: true })
    })
  }
})
