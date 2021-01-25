import { createLogger, chalk } from '@generates/logger'
import emojis from '../emojis.js'
import getResources from '../getResources.js'
import getPods from '../getPods.js'

const logger = createLogger({ namespace: 'kdot.show', level: 'info' })

async function getStatus (namespace, name) {
  const pods = await getPods(namespace, name)
  const states = pods.map(pod => {
    if (pod.status.containerStatuses[0]?.state.running) {
      return 'Running'
    } else if (pod.status.containerStatuses[0]?.state.waiting) {
      return pod.status.containerStatuses[0]?.state.waiting.reason
    } else if (pod.status.containerStatuses[0]?.state.terminated) {
      return pod.status.containerStatuses[0]?.state.terminated.reason
    }
    return 'Unknown'
  })

  const runningStates = states.filter(state => state === 'Running')
  const available = `(${runningStates.length}/${states.length} available)`
  if (runningStates.length === states.length) {
    return chalk.green(`Running ${available}`)
  } else if (runningStates.length) {
    return chalk.yellow(`Running ${available}`)
  }
  return chalk.red(`${states[0]} ${available}`)
}

async function showResource (resource) {
  const { namespace, name, uid } = resource.metadata
  let status = uid ? chalk.green('Existing') : chalk.dim('Unknown')

  if (resource.kind === 'Deployment') status = await getStatus(namespace, name)

  const message = `${resource.kind} ${chalk.yellow(name)}: ${status}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

export default async function show (cfg) {
  const resources = await getResources(cfg)

  try {
    process.stdout.write('\n')
    await Promise.all(Object.entries(cfg.apps).map(async ([name]) => {
      for (const resource of resources.filter(r => r.app?.name === name)) {
        await showResource(resource)
      }
    }))
    process.stdout.write('\n')
  } catch (err) {
    logger.error(err)
  }
}
