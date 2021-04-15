import getLivingPods from './getLivingPods.js'

function byIsReady (pod) {
  const [status] = pod?.status?.containerStatuses || []
  return status?.ready
}

export default async function getReadyPods (config = {}) {
  function getReadyPodsCondition (allPods) {
    const pods = allPods?.filter(byIsReady).slice(0, config.limit) || []
    return config.limit === 1 ? pods.shift() : pods
  }
  return getLivingPods({ condition: getReadyPodsCondition, ...config })
}
