import net from 'net'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'
import { createLogger } from '@generates/logger'

const logger = createLogger({ level: 'info', namespace: 'kdot.fwd' })

// Read the protocol buffer.
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

// Load the tunnel RPC service.
const { grpc_tunnel: tunnel } = grpc.loadPackageDefinition(packageDefinition)

// Create the default credentials.
const credentials = grpc.credentials.createInsecure()

export default function reversePort (config) {
  const { ktunnelPort = '28688' } = config

  // Create the gRPC client to communicate with the ktunnel server.
  const client = new tunnel.Tunnel(`localhost:${ktunnelPort}`, credentials)

  // Initialize the tunnel to get the duplex stream used to communicate.
  const stream = client.initTunnel()

  // Open the connection to ktunnel and tell it what port to listen on by
  // sending an initial message on the stream.
  stream.write({ port: config.port })

  // Listen for requests from ktunnel.
  stream.on('data', ({ requestId, data, shouldClose }) => {
    logger.debug('Request', { requestId })

    if (shouldClose) {
      // If the client closed the connection, close the session.
      logger.debug('Close request', { requestId })
      stream.write({ requestId, shouldClose })
    } else {
      // Otherwise forward the request to the local server.
      const client = net.createConnection({ port: config.reversePort }, () => {
        logger.debug('Connected to server', { requestId })

        // Forward the data received from ktunnel to the local server.
        client.write(data, err => {
          logger.debug('Client write', { requestId })
          if (err) {
            logger.error('Client write error', requestId, err)
            stream.write({ requestId, hasErr: true })
          }
        })
      })

      // Pass data returned by the local server to ktunnel.
      client.on('data', async data => {
        logger.debug('Client data', { requestId })
        stream.write({ requestId, data })
      })

      // When the local server closes the connection, tell ktunnel to close it's
      // connection to the requesting client.
      client.on('end', () => {
        logger.debug('Client end', { requestId })
        stream.write({ requestId, shouldClose: true })
      })
    }
  })
}
