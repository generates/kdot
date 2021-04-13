import { createLogger } from '@generates/logger'
import slugify from '@sindresorhus/slugify'
// import { kc } from '../k8s.js'
import configure from '../configure/index.js'
import getGitBranch from '../getGitBranch.js'
import set from './set.js'

const logger = createLogger({ level: 'debug', namespace: 'kdot.ns' })

export default async function ns (input) {
  const cfg = input.input ? input : await configure(input)

  //
  let [namespace] = input.args
  if (!namespace) {
    const branch = await getGitBranch()
    logger.debug('Branch:', branch)
    if (branch) {
      namespace = input.prefix + slugify(branch).substr(0, 64)
      logger.debug('Namespace:', namespace)
    } else {
      throw new Error('No namespace specified and could not be determined')
    }
  }

  //
  input.ext = { namespace }

  await set(input)

  // Lookup namespace.

  // Create the namespace if it doesn't exist.

  // Get default service account secret for the namespace.

  // Determine the kubeconfig context to use.
  // const context = cfg.context || kc.currentContext
  // logger.debug('Context', context)

  // Get the cluster server address.
  // const { server } = kc.clusters.find(c => c.name === context) || {}

  // logger.debug('Cluster server address', server)
}
