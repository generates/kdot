import { createLogger } from '@generates/logger'
import getPods from './getPods.js'
import poll from './poll.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const toContainerStatus = pod => pod?.status?.containerStatuses
const hasPods = pods => Array.isArray(pods) ? pods.length : pods

function byIsRunning (pod) {
  const [status] = pod?.status?.containerStatuses || []
  return status?.state.running && !pod.metadata.deletionTimestamp
}

export default async function getRunningPods (namespace, name, config = {}) {
  const request = async () => {
    const allPods = await getPods(namespace, name)
    if (allPods.length && allPods.every(p => p.status?.phase === 'Failed')) {
      throw new Error(`All retrieved pods are in failed state: ${name}`)
    }
    const pods = allPods?.filter(byIsRunning).slice(0, config.limit) || []
    logger.debug('getRunningPods', { name, pods: pods.map(toContainerStatus) })
    return config.limit === 1 ? pods.shift() : pods
  }
  return poll({ request, condition: hasPods, ...config })
}
