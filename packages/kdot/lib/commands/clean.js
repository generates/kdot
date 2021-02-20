import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { oneLine } from 'common-tags'
import { kc, k8s } from '../k8s.js'
import getPods from '../getPods.js'
import emojis from '../emojis.js'

const logger = createLogger({ namespace: 'kdot.cleanup', level: 'info' })
const separator = chalk.dim('•')

export default async function clean (cfg) {
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

  if (failedPods.length) {
    if (cfg.input.prompt) {
      try {
        const question = oneLine`
          Are you sure you want to delete these pods in the
          ${chalk.yellow(cfg.namespace)} namespace of
          ${chalk.yellow(kc.currentContext)}?
        `
        const response = await prompt.select(question)
        process.stdout.write('\n')
        if (response === 'No') process.exit(0)
      } catch (err) {
        logger.debug(err)
        process.exit(0)
      }

      await Promise.all(failedPods.map(async pod => {
        await k8s.client.delete({ ...pod, apiVersion: 'v1', kind: 'Pod' })
      }))

      logger.success('Cleaned up failed pods')
    }
  } else {
    process.stdout.write('\n')
    logger.info('No pods to cleanup')
  }

  process.stdout.write('\n')
}
