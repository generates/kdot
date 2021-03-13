import net from 'net'
import enableDestroy from 'server-destroy'
import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'
import { PortForward, kc } from '../k8s.js'
import getRunningPods from '../getRunningPods.js'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot.fwd', level: 'info' })
const pollConfig = { interval: 1000, timeout: 300000, limit: 1 }

function forwardPort (app, pod, portConfig) {
  return new Promise((resolve, reject) => {
    let server
    try {
      const { name, namespace } = pod.metadata

      // Create the server the local server that will forward requests to the
      // pod.
      server = net.createServer(async socket => {
        // Catch any error events on the socket.
        socket.on('error', err => {
          logger.error('Socket error, attempting port forward reconnect', err)
          reconnect()
        })

        // Create the WebSocket that will transport requests and responses.
        const portForwarder = new PortForward(kc)
        await portForwarder.portForward(
          namespace,
          name,
          [portConfig.port],
          socket,
          undefined,
          socket
        )
      })

      // Keep track of sockets so that the server can be killed quickly in case
      // the port forward has to be recreated.
      enableDestroy(server)

      const reconnect = async () => {
        try {
          // Kill the existing server.
          server.destroy()

          // Attempt to get a running pod.
          const pod = await getRunningPods(namespace, app.name, pollConfig)

          // Create a new port forward to the new pod.
          server = await forwardPort(app, pod, portConfig)
        } catch (e) {
          logger.error('Port forward reconnect failed for:', app.name, e || '')
        }
      }

      process.on('unhandledRejection', ctx => {
        const message = ctx.error?.message
        const url = ctx.target?._url
        if (url?.includes(name)) {
          logger.warn('Attempting port forward reconnect', { message, url })
          reconnect()
        } else if (!url) {
          logger.error('Port forward error', ctx)
        }
      })

      // Instruct the local server to listen on a port.
      const localPort = portConfig.localPort || portConfig.port
      server.listen(localPort, 'localhost', () => {
        const portName = portConfig.name ? `(${portConfig.name})` : ''
        logger.success(oneLine`
          Forwarding for ${app.name} http://localhost:${localPort} to
          ${pod.metadata.name}:${portConfig.port} ${portName}
        `)
        resolve(server)
      })
    } catch (err) {
      if (server) server.destroy()
      reject(err)
    }
  })
}

/**
 * Setup port forwarding between configured apps in the cluster and the
 * local host.
 */
export default async function fwd (input) {
  const cfg = input.input ? input : await configure(input)
  const apps = Object.values(cfg.apps).filter(a => a.enabled)
  await Promise.all(apps.map(async app => {
    if (app.ports) {
      try {
        const namespace = app.namespace || cfg.namespace
        const pod = await getRunningPods(namespace, app.name, pollConfig)
        for (const p of app.ports) await forwardPort(app, pod, p)
      } catch (err) {
        logger.error(err)
      }
    }
  }))
}
