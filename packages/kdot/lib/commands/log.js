import { createLogger, chalk } from '@generates/logger'
import getRunningPods from '../getRunningPods.js'
import configure from '../configure/index.js'
import streamPodLogs from '../streamPodLogs.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const colors = [
  'blue',
  'yellow',
  'magenta',
  'cyan',
  'red',
  'green',
  'white'
]

async function streamLogs (app, color) {
  const pods = await getRunningPods(app.namespace, app.name)
  for (const pod of pods) {
    const podName = chalk.dim(pod.metadata.name.replace(`${app.name}-`, ''))
    await streamPodLogs({
      namespace: app.namespace,
      name: pod.metadata.name,
      logName: `${chalk.bold[color](app.name)} • ${podName}`,
      done (err) {
        if (err) logger.error(err)
        logger.warn('Logs done for:', app.name)
        streamLogs(app, color)
      }
    })
  }
}

export default async function log (input) {
  const cfg = input.input ? input : await configure(input)
  const bySpecified = input.args.length ? a => a.isSpecified : a => a.enabled
  const apps = Object.values(cfg.apps).filter(bySpecified)
  await Promise.all(apps.map(async (app, index) => {
    try {
      await streamLogs(app, colors[index % 7])
    } catch (err) {
      logger.error(err)
    }
  }))
}
