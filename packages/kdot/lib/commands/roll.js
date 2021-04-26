import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import configure from '../configure/index.js'
import getTargetApps from '../getTargetApps.js'
import getPods from '../getPods.js'
import scale from './scale.js'
import getReadyPods from '../getReadyPods.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.roll' })

export default async function roll (input) {
  const cfg = input.input ? input : await configure(input)

  // Iterate over target apps.
  await Promise.all(getTargetApps(cfg).map(async app => {
    try {
      const { namespace, name, replicas = 1 } = app

      // Get pods.
      const pods = await getPods(namespace, name)

      for (let i = 0; i <= replicas - 1; i++) {
        // TODO: Check if the current pod has an old config hash in case an
        // apply was just run that increased the replicas and so the pod might
        // already be fresh.
        const pod = { ...pods[i], kind: 'Pod' }
        logger.debug('Pod', pod)

        if (pods.length > 1) {
          // If there are multiple pods, delete one.
          await k8s.client.delete(pod)

          // Wait for the new pod to be ready before continuing.
          const options = { limit: replicas, timeout: cfg.input.timeout }
          await getReadyPods({ namespace, name, ...options })
        } else {
          // Otherwise scale the replicas to 2.
          await scale(merge({}, cfg, { input: { replicas: 2, wait: true } }))

          // Delete the old pod now that the new one is ready.
          await k8s.client.delete(pod)

          // Scale the replicas back down to 1.
          await scale(merge({}, cfg, { input: { replicas: 1, wait: true } }))
        }
      }

      logger.success(`Rolled out ${replicas} replicas for ${name}`)
    } catch (err) {
      logger.error(err)
    }
  }))
}
