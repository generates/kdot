import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import getRunningPod from '../getRunningPod.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.cp' })

export default async function cp (cfg) {
  const [name, from, to] = cfg.input.args

  if (!name) {
    logger.fatal('An app needs to be specified')
    process.exit(1)
  }

  if (!from) {
    logger.fatal('The source path needs to be specified')
    process.exit(1)
  }

  if (!to) {
    logger.fatal('The targt path needs to be specified')
    process.exit(1)
  }

  const { namespace } = cfg.apps[name]
  const pod = await getRunningPod(namespace, name)
  if (pod) {
    await k8s.cp.cpFromPod(
      namespace,
      pod.metadata.name,
      name,
      from,
      to
    )
  } else {
    logger.fatal('Could not get running pod', { namespace, name })
    process.exit(1)
  }
}
