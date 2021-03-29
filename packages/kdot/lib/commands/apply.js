import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { kc } from '../k8s.js'
import emojis from '../emojis.js'
import getResources from '../getResources.js'
import applyResource from '../applyResource.js'
import getRunningPods from '../getRunningPods.js'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const byTopLevelNamespace = r => !r.app && r.kind === 'Namespace'
const byTopLevel = r => !r.app && r.kind !== 'Namespace'
const byDeployment = r => r.kind === 'Deployment'
const setupApplyResource = input => resource => applyResource(resource, input)

function logUpdate (resource) {
  const change = resource.metadata.uid
    ? chalk.blue('Update')
    : chalk.green('Create')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${change} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

export default async function apply (input) {
  const cfg = input.input ? input : await configure(input)

  function isRequired (r) {
    const isArg = r.app && cfg.input.args?.includes(r.app.name)
    return !cfg.input.args?.length || isArg || r.app?.isDependency || !r.app
  }
  function byNew (r) {
    return !r.metadata?.uid && isRequired(r)
  }
  function byNotExistingNs (r) {
    return (!r.metadata?.uid || r.kind !== 'Namespace') && isRequired(r)
  }
  const filter = cfg.input.update === false ? byNew : byNotExistingNs
  const resources = await getResources(cfg, filter)

  process.stdout.write('\n')

  if (cfg.input.prompt && resources.length) {
    try {
      resources.forEach(logUpdate)
      const c = chalk.yellow(kc.currentContext)
      const question = `Are you sure you want to apply these changes to ${c}?`
      const response = await prompt.select(question)
      process.stdout.write('\n')
      if (response === 'No') process.exit(0)
    } catch (err) {
      logger.debug(err)
      process.exit(0)
    }
  }

  // Setup the applyResource function with the run configuration.
  const applyResource = setupApplyResource(cfg.input)

  // Apply top-level namespaces before other resources in case they depend on
  // them.
  await Promise.all(resources.filter(byTopLevelNamespace).map(applyResource))

  // Apply top-level resources before app-level resources in case the apps
  // depend on them.
  await Promise.all(resources.filter(byTopLevel).map(applyResource))

  // Apply the app-level resources.
  await Promise.all(Object.entries(cfg.apps || {}).map(async ([name]) => {
    for (const resource of resources.filter(r => r.app?.name === name)) {
      await applyResource(resource)
    }
  }))

  process.stdout.write('\n')

  if (cfg.input.wait) {
    logger.info('Waiting for pods to run...')
    process.stdout.write('\n')
    await Promise.all(resources.filter(byDeployment).map(async deployment => {
      const { namespace, name } = deployment.metadata
      await getRunningPods(namespace, name, { limit: 1 })
    }))
  }
}
