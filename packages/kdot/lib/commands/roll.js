import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import configure from '../configure/index.js'
import getTargetApps from '../getTargetApps.js'
import getPods from '../getPods.js'
import scale from './scale.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.roll' })

export default async function roll (input) {
  const cfg = input.input ? input : await configure(input)

  // Iterate over target apps.
  for (const app of getTargetApps(cfg)) {
    const { namespace, name, replicas = 1 } = app

    // Get pods.
    const pods = await getPods(namespace, name)

    for (let i = 0; i <= replicas - 1; i++) {
      // TODO: Check if the current pod has an old config hash.
      const pod = pods[i]

      if (pods.length > 1) {
        // If there are multiple pods, delete one.
      } else {
        // Otherwise scale the replicas to 2.
        await scale
      }

      // Wait for new pod to be ready.

      // If there was only 1 pod before, delete it now that the new one is
      // ready.

      // Scale the replicas back down to 1 if necessary.
    }
  }
}
