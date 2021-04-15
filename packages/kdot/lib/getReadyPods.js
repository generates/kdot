import { createLogger } from '@generates/logger'
import getPods from './getPods.js'
import poll from './poll.js'

const logger = createLogger({ namespace: 'kdot.pods', level: 'info' })
const toContainerStatus = pod => pod?.status?.containerStatuses
const hasPods = pods => Array.isArray(pods) ? pods.length : pods

function byIsReady (pod) {
  const [status] = pod?.status?.containerStatuses || []
  return status?.ready && !pod.metadata.deletionTimestamp
}

export default async function getReadyPods (namespace, name, config = {}) {
  async function getReadyPodsRequest () {
    const allPods = await getPods(namespace, name)
    if (allPods.length && allPods.every(p => p.status?.phase === 'Failed')) {
      throw new Error(`All retrieved pods are in failed state: ${name}`)
    }
    const pods = allPods?.filter(byIsReady).slice(0, config.limit) || []
    logger.debug('getReadyPods', { name, pods: pods.map(toContainerStatus) })
    return config.limit === 1 ? pods.shift() : pods
  }
  return poll({ request: getReadyPodsRequest, condition: hasPods, ...config })
}
