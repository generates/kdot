import stream from 'stream'
import { createLogger, chalk } from '@generates/logger'
import { core, klog } from './k8sApi.js'

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

async function getPods (namespace, name) {
  const { body: { items } } = await core.listNamespacedPod(
    namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${name}`
  )
  return items.filter(p => !p.metadata.deletionTimestamp)
}

const intervalSeconds = 3
const maxChecks = 20
async function getRunningPods (namespace, name) {
  const pods = await getPods(namespace, name)
  if (pods.every(p => p.status.phase === 'Running')) {
    logger.debug('Got running pods', pods.map(p => p.metadata.name))
    return pods
  } else {
    return new Promise((resolve, reject) => {
      let checks = 0
      const interval = setInterval(
        async () => {
          try {
            const pods = await getPods(namespace, name)
            checks++

            logger.debug('Pods status check', pods.map(p => p.status))

            if (pods.every(p => p.status.phase === 'Running')) {
              clearInterval(interval)
              logger.debug('Got running pods', pods.map(p => p.metadata.name))
              resolve(pods)
            } else if (checks >= maxChecks) {
              clearInterval(interval)
              const t = `${maxChecks * intervalSeconds} seconds`
              reject(new Error(`Can't get running pods, timeout after: ${t}`))
            }
          } catch (err) {
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
  const pods = await getRunningPods(app.namespace, app.name)
  for (const pod of pods.filter(p => !streamedPods.includes(p.metadata.name))) {
    const podName = chalk.dim(pod.metadata.name.replace(`${app.name}-`, ''))
    const logName = `${chalk.bold[color](app.name)} • ${podName}`

    await klog.log(
      app.namespace,
      pod.metadata.name,
      undefined,
      new stream.Transform({
        transform (chunk, encoding, callback) {
          process.stdout.write(`${logName} • ` + chunk.toString(), callback)
        }
      }),
      function done () {
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

export default async function log (cfg) {
  const apps = Object.values(cfg.apps).filter(a => a.enabled)
  await Promise.all(apps.map(async (app, index) => {
    try {
      await streamLogs(app, colors[index % 7])
    } catch (err) {
      logger.error(err)
    }
  }))
}
