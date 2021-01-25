import { createLogger } from '@generates/logger'
import getPods from './getPods.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const intervalSeconds = 3
const maxChecks = 20

function isRunning (pod) {
  return pod &&
    !pod.metadata.deletionTimestamp &&
    pod.status.containerStatuses[0]?.state.running
}

async function getPod (namespace, name) {
  const pods = await getPods(namespace, name)
  return pods.find(isRunning) || pods[0]
}

export default async function getRunningPod (namespace, name) {
  const pod = await getPod(namespace, name)
  if (isRunning(pod)) {
    const { metadata, status } = pod
    logger.debug('Got running pod', { metadata, status })
    return pod
  } else {
    return new Promise((resolve, reject) => {
      let checks = 0

      function abort (err) {
        clearInterval(interval)
        reject(err)
      }

      // Don't block the process from exiting.
      process.on('SIGINT', abort)

      const interval = setInterval(
        async () => {
          try {
            const pod = await getPod(namespace, name)
            checks++

            logger.debug(`Pod status check ${checks} for:`, name)

            if (isRunning(pod)) {
              clearInterval(interval)
              const { metadata, status } = pod
              logger.debug('Got running pod', { metadata, status })
              resolve(pod)
            } else if (checks >= maxChecks) {
              clearInterval(interval)
              const t = `${maxChecks * intervalSeconds} seconds`
              reject(new Error(`Can't get running pod, timeout after: ${t}`))
            } else if (pod?.status.phase === 'Failed') {
              throw new Error(`Can't get running pod, pod failed: ${name}`)
            }
          } catch (err) {
            abort(err)
          }
        },
        intervalSeconds * 1000
      )
    })
  }
}
