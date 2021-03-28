import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { oneLine } from 'common-tags'
import { kc, k8s } from '../k8s.js'
import configure from '../configure/index.js'
import showResources from '../showResources.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const noYesOptions = [
  { label: 'No', value: false },
  { label: 'Yes', value: true }
]

export default async function del (input) {
  const cfg = input.input ? input : await configure(input)
  const { namespace } = cfg
  const cluster = chalk.yellow(kc.currentContext)
  const hasArgs = input.args.length

  // Collect and log the matching resources.
  process.stdout.write('\n')
  const resources = await showResources(cfg)

  try {
    if (hasArgs) {
      if (cfg.input.prompt) {
        // Show resource deletion confirmation prompt.
        const response = await prompt.select(
          oneLine`
            Are you sure you want to delete the preceding resources from
            ${cluster}?
          `,
          { options: noYesOptions }
        )
        if (response === 'No') return
      }

      // Delete the given app's resources from the cluster.
      process.stdout.write('\n')
      await Promise.all(resources.map(async resource => {
        try {
          await k8s.client.delete(resource)
        } catch (err) {
          const msg = err.message
          logger.warn(
            oneLine`
              Error thrown deleting ${resource.kind} ${resource.metadata.name}
              ${msg ? ':' : ''}
            `,
            msg
          )
          logger.debug(err)
        }
      }))
    } else if (namespace !== 'default') {
      if (cfg.input.prompt) {
        // Show namespace deletion confirmation prompt.
        const response = await prompt.select(
          oneLine`
            Are you sure you want to delete the ${chalk.yellow(namespace)}
            namespace and all resources associated with it from ${cluster}?
          `,
          { options: noYesOptions }
        )
        if (response === 'No') return
      }

      // Delete the namespace from the cluster.
      process.stdout.write('\n')
      const ns = r => r.kind === 'Namespace' && r.metadata.name === namespace
      await k8s.client.delete(cfg.resources.find(ns))
    } else {
      logger.error('No apps specified and cannot delete default namespace')
      process.exit(1)
    }
  } catch (err) {
    const msg = err.message
    logger.warn(`Error thrown during delete${msg ? ':' : ''}`, msg)
    logger.debug(err)
    return
  }

  logger.success(`Successfully deleting ${hasArgs ? 'resources' : 'namespace'}`)
  process.stdout.write('\n')
}
