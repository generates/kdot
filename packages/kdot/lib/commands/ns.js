import { createLogger } from '@generates/logger'
import { kc } from '../k8s.js'
import configure from '../configure/index.js'

const logger = createLogger({ level: 'debug', namespace: 'kdot.ns' })

export default async function ns (input) {
  //
  const cfg = input.input ? input : await configure(input)

  // Lookup namespace.

  // Create the namespace if it doesn't exist.

  // Get default service account secret for the namespace.

  // Determine the kubeconfig context to use.
  const context = cfg.context || kc.currentContext
  logger.debug('Context', context)

  // Get the cluster server address.
  const { server } = kc.clusters.find(c => c.name === context) || {}

  logger.debug('Cluster server address', server)
}
