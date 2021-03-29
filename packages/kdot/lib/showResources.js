import { createLogger, chalk } from '@generates/logger'
import getResources from './getResources.js'
import emojis from './emojis.js'
import getPods from './getPods.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.show' })

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

export default async function showResources (cfg) {
  const filter = cfg.input.args?.length
    ? r => r.app && cfg.input.args?.includes(r.app.name)
    : r => r.kind !== 'Namespace'
  const resources = await getResources(cfg, filter)

  await Promise.all(resources.map(async resource => {
    const { namespace, name, uid } = resource.metadata
    let status = uid ? chalk.green('Existing') : chalk.dim('Unknown')

    if (resource.kind === 'Deployment' && uid) {
      status = await getStatus(namespace, name)
    }

    const message = `${resource.kind} ${chalk.yellow(name)}: ${status}`
    logger.log(emojis[resource.kind] || emojis.k8, message)
  }))

  return resources
}
