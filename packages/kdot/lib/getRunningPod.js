import { createLogger } from '@generates/logger'
import getPods from './getPods.js'
import poll from './poll.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

function isRunning (pod) {
  return pod &&
    !pod.metadata.deletionTimestamp &&
    pod.status.containerStatuses[0]?.state.running
}

async function getPod (namespace, name) {
  const pods = await getPods(namespace, name)
  const pod = pods.find(isRunning) || (pods.length && pods[0])
  logger.debug('getPod', pod)
  return pod
}

export default async function getRunningPod (namespace, name, config) {
  const request = () => getPod(namespace, name)
  return poll({ request, condition: isRunning, ...config })
}
