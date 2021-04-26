import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { oneLine } from 'common-tags'
import prompt from '@generates/prompt'
import { k8s } from '../k8s.js'
import configure from '../configure/index.js'
import getPods from '../getPods.js'
import scale from './scale.js'
import getReadyPods from '../getReadyPods.js'
import { toExtractedResource } from '../getResources.js'
import getTargetDeployments from '../getTargetDeployments.js'
import showResources from '../showResources.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.roll' })

export default async function roll (input) {
  const cfg = input.input ? input : await configure(input)
  const deployments = await getTargetDeployments(cfg)

  process.stdout.write('\n')
  if (cfg.input.prompt && deployments.length) {
    try {
      await showResources(cfg, deployments)
      const response = await prompt.select(oneLine`
        Are you sure you want to rollout updated pods?
      `)
      process.stdout.write('\n')
      if (response === 'No') process.exit(0)
    } catch (err) {
      logger.debug(err)
      process.exit(0)
    }
  } else if (!deployments.length) {
    logger.fatal('Failed to find app deployments')
    process.stdout.write('\n')
    process.exit(1)
  }

  // Iterate over target apps.
  await Promise.all(deployments.map(async deployment => {
    try {
      const { namespace, name } = deployment.metadata
      const replicas = deployment.spec.replicas

      // Get pods.
      const pods = await getPods(namespace, name)

      //
      if (pods.length > 1) process.stdout.write('\n')

      for (let i = 0; i <= replicas - 1; i++) {
        // TODO: Check if the current pod has an old config hash in case an
        // apply was just run that increased the replicas and so the pod might
        // already be fresh.
        const pod = { ...pods[i], kind: 'Pod' }
        logger.debug('Existing pod', toExtractedResource(pod))

        if (pods.length > 1) {
          // If there are multiple pods, delete one.
          await k8s.client.delete(pod)

          logger.info(`Waiting for ${name} pods to be ready...`)
          process.stdout.write('\n')

          // Wait for the new pod to be ready before continuing.
          const options = { limit: replicas, timeout: cfg.input.timeout }
          await getReadyPods({ namespace, name, ...options })
        } else {
          // Otherwise scale the replicas to 2.
          const input = { replicas: 2, wait: true, prompt: false }
          await scale(merge({}, cfg, { input }), [deployment])

          // Delete the old pod now that the new one is ready.
          await k8s.client.delete(pod)

          // Scale the replicas back down to 1.
          input.replicas = 1
          await scale(merge({}, cfg, { input }), [deployment])
        }
      }

      logger.success(`Rolled out ${replicas} replicas for ${name}`)
      process.stdout.write('\n')
    } catch (err) {
      logger.error(err)
    }
  }))
}
