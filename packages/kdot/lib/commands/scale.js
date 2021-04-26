import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import prompt from '@generates/prompt'
import configure from '../configure/index.js'
import getTargetApps from '../getTargetApps.js'
import set from './set.js'
import applyResource from '../applyResource.js'
import getResources from '../getResources.js'
import showResources from '../showResources.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.scale' })

export default async function scale (input) {
  const cfg = input.input ? input : await configure(input)
  const replicas = cfg.input.replicas

  // Make sure the number of replicas was specified. This can probably be moved
  // to cli when it supports required options.
  process.stdout.write('\n')
  if (!replicas) {
    logger.fatal('The number of replicas must be specified with the -r flag')
    process.stdout.write('\n')
    process.exit(1)
  }

  // Get the Deployment resources for the target apps.
  const targetApps = getTargetApps(cfg)
  function isTargetDeployment (resource) {
    const isDeployment = resource.kind === 'Deployment'
    return isDeployment && targetApps.find(a => a.name === resource.app.name)
  }
  const resources = await getResources(cfg, isTargetDeployment)

  if (cfg.input.prompt && resources.length) {
    try {
      await showResources(cfg, resources)
      const q = `Are you sure you want to scale Deployments to ${replicas}?`
      const response = await prompt.select(q)
      process.stdout.write('\n')
      if (response === 'No') process.exit(0)
    } catch (err) {
      logger.debug(err)
      process.exit(0)
    }
  } else if (!resources.length) {
    logger.fatal('Failed to find app Deployment(s)')
    process.stdout.write('\n')
    process.exit(1)
  }

  // Iterate over target Deployments.
  await Promise.all(resources.map(async deployment => {
    const name = deployment.app.name
    try {
      // Update the number of replicas in the app's Deployment resource.
      deployment.spec.replicas = replicas

      // Write the updated number of replicas to the JSON config.
      await set({ ...cfg.input, ext: { apps: { [name]: { replicas } } } })

      // Apply the resource changes.
      await applyResource(cfg, deployment)

      // If specified, wait for all the pods to be ready.
      if (cfg.input.wait) {
        // TODO:
      }

      // Show that the Deployment was successfully scaled.
      logger.success(`Scaled ${name} to ${replicas} replicas`)
    } catch (err) {
      logger.error(`Failed to scale ${name} to ${replicas} replicas`)
    }
  }))

  process.stdout.write('\n')
}
