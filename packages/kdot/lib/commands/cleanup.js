import { createLogger, chalk } from '@generates/logger'
import getPods from '../getPods.js'
import emojis from '../emojis.js'

const logger = createLogger({ namespace: 'kdot.cleanup', level: 'info' })
const separator = chalk.dim('•')

export default async function cleanup (cfg) {
  const failedPods = []

  const pods = await getPods(cfg.namespace)
  await Promise.all(pods.map(async pod => {
    logger.debug('Pod', pod.metadata.name, pod.status)
    if (pod.status.phase === 'Failed') failedPods.push(pod)
  }))

  for (const pod of failedPods) {
    const name = chalk.bold.red(pod.metadata.name)
    const [status] = pod.status.containerStatuses || []
    if (pod.status.reason === 'Evicted') {
      const reason = chalk.bold.white('Evicted')
      logger.log(emojis.evicted, name, separator, reason)
    } else if (status?.state?.terminated?.reason === 'OOMKilled') {
      const reason = chalk.bold.white('Killed: out of memory')
      logger.log(emojis.killed, name, separator, reason)
    } else {
      logger.log(emojis.error, name, separator, chalk.bold.white('Error'))
    }
    if (pod.status.message) logger.log(pod.status.message)
  }
}
