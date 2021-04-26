import { createLogger, chalk } from '@generates/logger'
import getResources, { toExtractedResource } from './getResources.js'
import emojis from './emojis.js'
import getPods from './getPods.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.show' })

function getStatus (pods) {
  const podStates = pods.map(pod => {
    if (pod.status.containerStatuses[0]?.ready) {
      return 'Ready'
    } else if (pod.status.containerStatuses[0]?.state.running) {
      return 'Running'
    } else if (pod.status.containerStatuses[0]?.state.waiting) {
      return pod.status.containerStatuses[0]?.state.waiting.reason
    } else if (pod.status.containerStatuses[0]?.state.terminated) {
      return pod.status.containerStatuses[0]?.state.terminated.reason
    }
    return 'Unknown'
  })

  const runningStates = ['Ready', 'Running']
  const readyPods = podStates.filter(state => state === 'Ready')
  const runningPods = podStates.filter(state => runningStates.includes(state))
  const available = `(${runningPods.length}/${podStates.length})`
  if (readyPods.length === podStates.length) {
    return chalk.green(`Ready ${available}`)
  } else if (runningPods.length === podStates.length) {
    return chalk.green(`Running ${available}`)
  } else if (runningPods.length) {
    return chalk.yellow(`Running ${available}`)
  }
  return chalk.red(`${podStates[0]} ${available}`)
}

export default async function showResources (cfg, resources) {
  if (!resources) {
    const filter = cfg.input.args?.length
      ? r => r.app && cfg.input.args?.includes(r.app.name)
      : r => r.kind !== 'Namespace'
    resources = await getResources(cfg, filter)
  }

  await Promise.all(resources.map(async resource => {
    const { namespace, name, uid } = resource.metadata
    let status = uid ? chalk.green('Existing') : chalk.dim('Unknown')

    let pods
    if (resource.kind === 'Deployment' && uid) {
      pods = await getPods(namespace, name)
      status = getStatus(pods)
    }

    const message = `${resource.kind} ${chalk.yellow(name)}: ${status}`
    logger.log(emojis[resource.kind] || emojis.k8, message)
    if (cfg.input.verbose) {
      logger.log(toExtractedResource(resource))
      pods?.forEach((pod, index) => {
        logger.log(emojis.Pod, `Pod ${chalk.yellow(name)}: ${index + 1}`)
        logger.log(toExtractedResource(pod))
      })
    }
  }))

  return resources
}
