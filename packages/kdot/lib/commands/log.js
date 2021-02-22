import stream from 'stream'
import { createLogger, chalk } from '@generates/logger'
import { k8s } from '../k8s.js'
import getPods from '../getPods.js'
import configure from '../configure/index.js'

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

const streamedPods = []
async function streamLogs (app, color) {
  const pods = await getReadyPods(app.namespace, app.name)
  for (const pod of pods.filter(p => !streamedPods.includes(p.metadata.name))) {
    const podName = chalk.dim(pod.metadata.name.replace(`${app.name}-`, ''))
    const logName = `${chalk.bold[color](app.name)} • ${podName}`

    await k8s.klog.log(
      app.namespace,
      pod.metadata.name,
      undefined,
      new stream.Transform({
        transform (chunk, encoding, callback) {
          process.stdout.write(`${logName} • ` + chunk.toString(), callback)
        }
      }),
      function done (err) {
        if (err) logger.error(err)
        logger.warn('Logs done for:', app.name)
        streamLogs(app)
      },
      // FIXME: Add config for tailLines
      { follow: true, tailLines: 100 }
    )

    // Add the pod to the streamed pods list so that the logs don't get
    // duplicated.
    streamedPods.push(pod.metadata.name)
  }
}

export default async function log (input) {
  const cfg = await configure(input)
  const apps = Object.values(cfg.apps).filter(a => a.enabled)
  await Promise.all(apps.map(async (app, index) => {
    try {
      await streamLogs(app, colors[index % 7])
    } catch (err) {
      logger.error(err)
    }
  }))
}
