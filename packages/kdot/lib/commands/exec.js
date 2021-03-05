import { createLogger } from '@generates/logger'
import { k8s } from '../k8s.js'
import getRunningPods from '../getRunningPods.js'
import configure from '../configure/index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.exec' })

export default async function exec (input) {
  const cfg = input.input ? input : await configure(input)

  // const { namespace } = cfg.apps[name]
  // const pod = await getRunningPods(namespace, name, { limit: 1 })
  // if (pod) {
  //   await k8s.cp.cpFromPod(
  //     namespace,
  //     pod.metadata.name,
  //     name,
  //     from,
  //     to
  //   )
  //   logger.success(`Successfully copied ${name}:${from} to ${to}`)
  // } else {
  //   logger.fatal('Could not get running pod', { namespace, name })
  //   process.exit(1)
  // }
}
