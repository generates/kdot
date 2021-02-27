import { createLogger, chalk } from '@generates/logger'
import getPods from '../getPods.js'
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

function isReady (pod) {
  return pod &&
    !pod.metadata.deletionTimestamp &&
    pod.status.containerStatuses[0]?.ready
}

const intervalSeconds = 3
const maxChecks = 20
async function getReadyPods (namespace, name) {
  const pods = await getPods(namespace, name)
  const readyPods = pods.filter(isReady)
  if (readyPods.length) {
    logger.debug('Got ready pods', readyPods.map(p => p.metadata.name))
    return readyPods
  } else {
    return new Promise((resolve, reject) => {
      let checks = 0
      const interval = setInterval(
        async () => {
          try {
            const pods = await getPods(namespace, name)
            const readyPods = pods.filter(isReady)
            checks++

            logger.debug('Pods status check', readyPods.map(p => p.status))

            if (readyPods.length) {
              clearInterval(interval)
              const names = readyPods.map(p => p.metadata.name)
              logger.debug('Got ready pods', names)
              resolve(readyPods)
            } else if (checks >= maxChecks) {
              const t = `${maxChecks * intervalSeconds} seconds`
              throw new Error(`Can't get ready pods, timeout after: ${t}`)
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

async function streamLogs (app, color) {
  const pods = await getReadyPods(app.namespace, app.name)
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
  const apps = Object.values(cfg.apps).filter(a => a.enabled)
  await Promise.all(apps.map(async (app, index) => {
    try {
      await streamLogs(app, colors[index % 7])
    } catch (err) {
      logger.error(err)
    }
  }))
}
