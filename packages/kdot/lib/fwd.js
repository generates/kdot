import net from 'net'
import enableDestroy from 'server-destroy'
import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'
import { core, k8s, kc } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot.fwd', level: 'info' })
const byIsRunning = p => (
  p.status.phase === 'Running' && !p.metadata.deletionTimestamp
)

async function getPod (namespace, name) {
  // FIXME: Maybe we can implement our own local load balancer to simulate
  // the service and distribute traffic to all of the pods instead of just
  // the first one?
  const { body: { items } } = await core.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${name}`
  )
  return items.find(byIsRunning) || items[0]
}

const intervalSeconds = 3
const maxChecks = 20
async function getRunningPod (namespace, name) {
  const pod = await getPod(namespace, name)
  if (pod?.status.phase === 'Running' && !pod?.metadata.deletionTimestamp) {
    logger.debug('Got running pod', pod.metadata)
    return pod
  } else {
    return new Promise((resolve, reject) => {
      let checks = 0
      const interval = setInterval(
        async () => {
          try {
            const pod = await getPod(namespace, name)
            checks++

            logger.debug('Pod status check', pod)

            const isRunning = pod?.status.phase === 'Running'
            if (isRunning && !pod?.metadata.deletionTimestamp) {
              clearInterval(interval)
              logger.debug('Got running pod', pod.metadata)
              resolve(pod)
            } else if (checks >= maxChecks) {
              clearInterval(interval)
              const t = `${maxChecks * intervalSeconds} seconds`
              reject(new Error(`Can't get running pod, timeout after: ${t}`))
            } else if (pod?.status.phase === 'Failed') {
              throw new Error(`Can't get running pod, pod failed: ${name}`)
            }
          } catch (err) {
            clearInterval(interval)
            reject(err)
          }
        },
        intervalSeconds * 1000
      )
    })
  }
}

function forwardPort (app, pod, portConfig) {
  return new Promise((resolve, reject) => {
    let server
    try {
      const { name, namespace } = pod.metadata

      // Create the server the local server that will forward requests to the
      // pod.
      server = net.createServer(async socket => {
        // Create the WebSocket that will transport requests and responses.
        const portForwarder = new k8s.PortForward(kc)
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

      process.on('unhandledRejection', async ({ target, error }) => {
        const hasErr = error.message.includes('Unexpected server response: 404')
        if (hasErr && target._url.includes(name)) {
          logger.debug('Unhandled rejection', error)
          logger.warn('Port forwarding disconnected for:', name)

          try {
            // Kill the existing server.
            server.destroy()

            // Attempt to get a running pod.
            const pod = await getRunningPod(namespace, app.name)

            // Create a new port forward to the new pod.
            server = await forwardPort(app, pod, portConfig)
          } catch (err) {
            const msg = 'Recreating the port forward failed for:'
            logger.error(msg, app.name, err || '')
          }
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
export default async function fwd (cfg) {
  const apps = Object.values(cfg.apps).filter(a => a.enabled)
  await Promise.all(apps.map(async app => {
    try {
      const pod = await getRunningPod(app.namespace || cfg.namespace, app.name)
      for (const p of app.ports) await forwardPort(app, pod, p)
    } catch (err) {
      logger.error(err)
    }
  }))
}
