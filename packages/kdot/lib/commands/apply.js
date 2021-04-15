import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { kc } from '../k8s.js'
import emojis from '../emojis.js'
import getResources from '../getResources.js'
import applyResource from '../applyResource.js'
import getReadyPods from '../getReadyPods.js'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot.apply', level: 'info' })
const byTopLevelNamespace = r => !r.app && r.kind === 'Namespace'
const byTopLevel = r => !r.app && r.kind !== 'Namespace'
const setupApplyResource = cfg => resource => applyResource(cfg, resource)

function logUpdate (resource) {
  const change = resource.metadata.uid
    ? chalk.blue('Update')
    : chalk.green('Create')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${change} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

function partition (items, filter) {
  const filtered = []
  const rest = []
  for (const item of items) {
    if (filter(item)) {
      filtered.push(item)
    } else {
      rest.push(item)
    }
  }
  return [filtered, rest]
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
  const applyResource = setupApplyResource(cfg)

  // Apply top-level namespaces before other resources in case they depend on
  // them.
  let [filtered, rest] = partition(resources, byTopLevelNamespace)
  await Promise.all(filtered.map(applyResource));

  // Apply top-level resources before app-level resources in case the apps
  // depend on them.
  [filtered, rest] = partition(rest, byTopLevel)
  await Promise.all(filtered.map(applyResource))

  // Apply the app-level resources.
  const deployments = []
  await Promise.all(Object.keys(cfg.apps || {}).map(async name => {
    for (let resource of rest.filter(r => r.app?.name === name)) {
      resource = await applyResource(resource)
      if (resource?.kind === 'Deployment') deployments.push(resource)
    }
  }))

  process.stdout.write('\n')

  if (cfg.input.wait) {
    logger.info('Waiting for pods to be ready...')
    process.stdout.write('\n')
    await Promise.all(deployments.map(async deployment => {
      const { namespace, name } = deployment.metadata
      const options = { limit: 1, timeout: cfg.input.timeout }
      await getReadyPods({ namespace, name, ...options })
    }))
  }
}
