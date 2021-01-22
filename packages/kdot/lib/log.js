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

const streamedPods = []
async function streamLogs (app) {
  const { body: { items: pods } } = await core.listNamespacedPod(
    app.namespace,
    undefined,
    undefined,
    undefined,
    undefined,
    `app=${app.name}`
  )

  for (const pod of pods.filter(p => !streamedPods.includes(p.metadata.name))) {
    const podName = chalk.dim(pod.metadata.name.replace(`${app.name}-`, ''))
    const logName = `${chalk.bold[app.color](app.name)} • ${podName}`

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

    //
    streamedPods.push(pod.metadata.name)
  }
}

export default async function log (cfg) {
  try {
    const apps = Object.values(cfg.apps).filter(a => a.enabled)
    for (const [index, app] of apps.entries()) {
      app.color = colors[index % 7]
      await streamLogs(app)
    }
  } catch (err) {
    logger.error(err)
  }
}
