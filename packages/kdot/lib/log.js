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

export default async function log (cfg) {
  try {
    for (const [index, deployment] of cfg.deployments.entries()) {
      const { name, namespace } = deployment.metadata
      const color = colors[index % 7]

      const { body: { items: pods } } = await core.listNamespacedPod(
        namespace,
        undefined,
        undefined,
        undefined,
        undefined,
        `app=${name}`
      )

      for (const pod of pods) {
        const podName = chalk.dim(pod.metadata.name.replace(`${name}-`, ''))
        const logName = `${chalk.bold[color](name)} • ${podName}`

        klog.log(
          namespace,
          pod.metadata.name,
          undefined,
          new stream.Transform({
            transform (chunk, encoding, callback) {
              process.stdout.write(`${logName} • ` + chunk.toString())
              callback()
            }
          }),
          function done (err) {
            err = JSON.parse(err)
            logger.write('\n')
            logger.error(`Logs exited for "${name}":`, err.message || err)
            logger.write('\n')
          },
          // FIXME: Add config for tailLines
          { follow: true, tailLines: 100 }
        )
      }
    }
  } catch (err) {
    logger.error(err)
  }
}
