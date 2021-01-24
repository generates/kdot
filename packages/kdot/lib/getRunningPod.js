import { createLogger } from '@generates/logger'
import getPod from './getPod.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const intervalSeconds = 3
const maxChecks = 20

export default async function getRunningPod (namespace, name) {
  const pod = await getPod(namespace, name)
  if (pod?.status.phase === 'Running' && !pod?.metadata.deletionTimestamp) {
    const { metadata, status } = pod
    logger.debug('Got running pod', { metadata, status })
    return pod
  } else {
    return new Promise((resolve, reject) => {
      let checks = 0
      const interval = setInterval(
        async () => {
          try {
            const pod = await getPod(namespace, name)
            checks++

            logger.debug(`Pod status check ${checks} for:`, name)

            const isRunning = pod?.status.phase === 'Running'
            if (isRunning && !pod?.metadata.deletionTimestamp) {
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
            clearInterval(interval)
            reject(err)
          }
        },
        intervalSeconds * 1000
      )
    })
  }
}
