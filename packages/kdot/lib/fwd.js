import net from 'net'
import { createLogger } from '@generates/logger'
import killable from 'killable'
import { oneLine } from 'common-tags'
import { core, pfwd } from './k8sApi.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

/**
 * Setup port forwarding between configured apps in the cluster and the
 * local host.
 */
export default async function fwd (cfg) {
  try {
    for (const app of cfg.enabledApps) {
      const namespace = app.namespace || cfg.namespace

      // FIXME: Maybe we can implement our own local load balancer to simulate
      // the service and distribute traffic to all of the pods instead of just
      // the first one.
      const { body: { items: [pod] } } = await core.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${app.name}`
      )

      for (const p of app.ports) {
        const localPort = p.localPort || p.port

        await new Promise((resolve, reject) => {
          const server = net.createServer(socket => {
            pfwd.portForward(
              namespace,
              pod.metadata.name,
              [p.port],
              socket,
              undefined,
              socket
            )
          })

          killable(server)

          server.on('error', err => {
            server.kill()
            reject(err)
          })

          server.listen(localPort, 'localhost', () => {
            logger.success(oneLine`
              Forwarding http://localhost:${localPort} to
              ${pod.metadata.name}:${p.port}
            `)
            resolve()
          })
        })
      }
    }
  } catch (err) {
    logger.error(err)
  }
}
