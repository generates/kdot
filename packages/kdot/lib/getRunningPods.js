import getLivingPods from './getLivingPods.js'

function byIsRunning (pod) {
  const [status] = pod?.status?.containerStatuses || []
  return status?.state.running
}

export default async function getRunningPods (config = {}) {
  function getRunningPodsCondition (allPods) {
    const pods = allPods?.filter(byIsRunning).slice(0, config.limit) || []
    return config.limit === 1 ? pods.shift() : pods
  }
  return getLivingPods({ condition: getRunningPodsCondition, ...config })
}
