import getPods from './getPods.js'
import poll from './poll.js'

function byIsReady (pod) {
  const [status] = pod?.status?.containerStatuses || []
  return status?.ready && !pod.metadata.deletionTimestamp
}

export default async function getReadyPods (config = {}) {
  const { namespace, name } = config

  async function getReadyPodsRequest () {
    const allPods = await getPods(namespace, name)
    if (allPods.length && allPods.every(p => p.status?.phase === 'Failed')) {
      throw new Error(`All retrieved pods are in failed state: ${name}`)
    }
    return allPods
  }

  function condition (allPods) {
    const pods = allPods?.filter(byIsReady).slice(0, config.limit) || []
    return config.limit === 1 ? pods.shift() : pods
  }

  return poll({ request: getReadyPodsRequest, condition, ...config })
}
