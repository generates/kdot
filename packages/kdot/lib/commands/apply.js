import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { kc } from '../k8s.js'
import emojis from '../emojis.js'
import getResources from '../getResources.js'
import applyResource from '../applyResource.js'
import getRunningPod from '../getRunningPod.js'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const byTopLevelNamespace = r => !r.app && r.kind === 'Namespace'
const byTopLevel = r => !r.app && r.kind !== 'Namespace'
const byNewOrDep = r => !r.metadata.uid || r.app?.isDependency
const byNotExistingNs = r => !r.metadata.uid || r.kind !== 'Namespace'
const byDeployment = r => r.kind === 'Deployment'

function logUpdate (resource) {
  const change = resource.metadata.uid
    ? chalk.blue('Update')
    : chalk.green('Create')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${change} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

function setupApplyResource (input) {
  const logLevel = input.failFast ? 'fatal' : 'error'
  return resource => applyResource(resource, { logLevel })
}

export default async function apply (input) {
  const cfg = await configure(input)
  const stateFilter = input.update === false ? byNewOrDep : byNotExistingNs
  const filter = input.args.length
    ? r => stateFilter(r) && r.app && input.args.includes(r.app.name)
    : stateFilter
  const resources = await getResources(cfg, filter)

  if (input.prompt && resources.length) {
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
  const applyResource = setupApplyResource(input)

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

  if (input.wait) {
    process.stdout.write('\n')
    logger.info('Waiting for pods to run...')
    await Promise.all(resources.filter(byDeployment).map(async deployment => {
      const { namespace, name } = deployment.metadata
      await getRunningPod(namespace, name)
    }))
  }
}
