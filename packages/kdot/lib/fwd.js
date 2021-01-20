import net from 'net'
import { createLogger } from '@generates/logger'
import killable from 'killable'
import { oneLine } from 'common-tags'
import { core, pfwd } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

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
  return items.find(p => p.status.phase === 'Running') || items[0]
}

const interval = 3
const maxChecks = 20
async function getRunningPod (namespace, name) {
  const pod = await getPod(namespace, name)
  if (pod.status.phase === 'Running') {
    return pod
  } else {
    return new Promise((resolve, reject) => {
      let checks = 0
      const clearInterval = setInterval(
        async () => {
          try {
            const pod = await getPod(namespace, name)
            checks++
            if (pod.status.phase === 'Running') {
              clearInterval()
              resolve(pod)
            } else if (checks >= maxChecks) {
              clearInterval()
              const t = `${maxChecks * interval} seconds`
              reject(new Error(`Can't get running pod, timeout after: ${t}`))
            } else if (pod.status.phase !== 'Pending') {
              clearInterval()
              const p = pod.status.phase
              reject(new Error(`Can't get running pod, phase: ${p}`))
            }
          } catch (err) {
            reject(err)
          }
        },
        interval * 1000
      )
    })
  }
}

function forwardPort (pod, portConfig) {
  const server = net.createServer(socket => {
    pfwd.portForward(
      pod.metadata.namespace,
      pod.metadata.name,
      [portConfig.port],
      socket,
      undefined,
      socket,
      3
    )
  })

  killable(server)

  server.on('error', err => {
    // Inform the user that there was an error.
    logger.error('Handling forwarding server error', err.message || '')

    // Terminate the existing forwarding server.
    server.kill()

    // Attempt to get a running pod.
    getRunningPod(pod.metadata.namespace, pod.metadata.name)
      // Set up a new forwarding server.
      .then(pod => forwardPort(pod, portConfig))
      // Inform the user if a running pod can't be retrieved.
      .catch(err => logger.error(
        'Failed to get a running pod to forward to',
        err
      ))
  })

  server.listen(portConfig.port, 'localhost', () => {
    const localPort = portConfig.localPort || portConfig.port
    const name = portConfig.name ? `(${portConfig.name})` : ''
    logger.success(oneLine`
      Forwarding http://localhost:${localPort} to
      ${pod.metadata.name}:${portConfig.port} ${name}
    `)
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
      for (const port of app.ports) forwardPort(pod, port)
    } catch (err) {
      logger.error(err)
    }
  }))
}
