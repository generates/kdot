import { createLogger } from '@generates/logger'
import prompt from '@generates/prompt'
import { oneLine } from 'common-tags'
import configure from '../configure/index.js'
import set from './set.js'
import applyResource from '../applyResource.js'
import showResources from '../showResources.js'
import getReadyPods from '../getReadyPods.js'
import getTargetDeployments from '../getTargetDeployments.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.scale' })

export default async function scale (input, deployments) {
  const cfg = input.input ? input : await configure(input)
  const replicas = cfg.input.replicas

  // Make sure the number of replicas was specified. This can probably be moved
  // to cli when it supports required options.
  if (replicas === undefined || !Number.isInteger(replicas)) {
    process.stdout.write('\n')
    logger.fatal('The number of replicas must be specified with the -r flag')
    process.stdout.write('\n')
    process.exit(1)
  }

  // Get the deployment resources for the target apps.
  if (!deployments?.length) deployments = await getTargetDeployments(cfg)

  if (cfg.input.prompt && deployments.length) {
    try {
      process.stdout.write('\n')
      await showResources(cfg, deployments)
      const response = await prompt.select(oneLine`
        Are you sure you want to scale deployment(s) to ${replicas} replicas?
      `)
      process.stdout.write('\n')
      if (response === 'No') process.exit(0)
    } catch (err) {
      logger.debug(err)
      process.exit(0)
    }
  } else if (!deployments.length) {
    process.stdout.write('\n')
    logger.fatal('Failed to find app deployment(s)')
    process.stdout.write('\n')
    process.exit(1)
  }

  // Iterate over target deployments.
  await Promise.all(deployments.map(async deployment => {
    const { namespace, name } = deployment.metadata
    try {
      // Update the number of replicas in the app's deployment resource.
      deployment.spec.replicas = replicas

      // Write the updated number of replicas to the JSON config.
      process.stdout.moveCursor(0, -1)
      await set({ ...cfg.input, ext: { apps: { [name]: { replicas } } } })

      // Apply the resource changes.
      await applyResource(cfg, deployment)

      // If specified, wait for all the pods to be ready.
      if (cfg.input.wait) {
        process.stdout.write('\n')
        logger.info(`Waiting for ${name} pods to be ready...`)
        process.stdout.write('\n')
        const options = { limit: replicas, timeout: cfg.input.timeout }
        await getReadyPods({ namespace, name, ...options })
      }

      // Show that the deployment was successfully scaled.
      logger.success(`Scaled ${name} to ${replicas} replicas`)
    } catch (err) {
      logger.error(`Failed to scale ${name} to ${replicas} replicas`, err)
    }

    process.stdout.write('\n')
  }))
}
