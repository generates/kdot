import getPods from './getPods.js'
import poll from './poll.js'

function byIsLiving (pod) {
  return pod.status.phase !== 'Failed' && !pod.metadata.deletionTimestamp
}

export default async function getLivingPods (config = {}) {
  const { namespace, name } = config

  async function getLivingPodsRequest () {
    const allPods = await getPods(namespace, name)
    return allPods?.filter(byIsLiving) || []
  }

  return poll({ request: getLivingPodsRequest, ...config })
}
