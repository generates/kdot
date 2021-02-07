import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { kc } from './k8s.js'
import emojis from './emojis.js'
import getResources from './getResources.js'
import applyResource from './applyResource.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const byTopLevelNamespace = r => !r.app && r.kind === 'Namespace'
const byTopLevel = r => !r.app && r.kind !== 'Namespace'
const byNewOrDep = r => !r.metadata.uid || r.app?.isDependency
const byNotExistingNs = r => !r.metadata.uid && r.kind !== 'Namespace'

function logUpdate (resource) {
  const change = resource.metadata.uid
    ? chalk.blue('Update')
    : chalk.green('Create')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${change} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

function setupApplyResource (cfg) {
  const logLevel = cfg.input.failFast ? 'fatal' : 'error'
  return resource => applyResource(resource, { logLevel })
}

/**
 * Add configured apps to the cluster.
 */
export default async function apply (cfg) {
  const stateFilter = cfg.input.update === false ? byNewOrDep : byNotExistingNs
  const filter = cfg.input.args.length
    ? r => stateFilter(r) && r.app && cfg.input.args.includes(r.app.name)
    : stateFilter
  const resources = await getResources(cfg, filter)

  if (cfg.input.prompt && resources.length) {
    try {
      process.stdout.write('\n')
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
  await Promise.all(resources.filter(byTopLevelNamespace).map(applyResource))

  // Apply top-level resources before app-level resources in case the apps
  // depend on them.
  await Promise.all(resources.filter(byTopLevel).map(applyResource))

  // Apply the app-level resources.
  await Promise.all(Object.entries(cfg.apps).map(async ([name]) => {
    for (const resource of resources.filter(r => r.app?.name === name)) {
      await applyResource(resource)
    }
  }))
}
