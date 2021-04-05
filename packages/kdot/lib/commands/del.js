import { createLogger, chalk } from '@generates/logger'
import prompt from '@generates/prompt'
import { oneLine } from 'common-tags'
import { kc, k8s } from '../k8s.js'
import configure from '../configure/index.js'
import showResources from '../showResources.js'
import poll from '../poll.js'

const logger = createLogger({ namespace: 'kdot.del', level: 'info' })
const noYesOptions = [
  { label: 'No', value: false },
  { label: 'Yes', value: true }
]

async function waitForDelete (cfg, resource) {
  const request = () => k8s.client.read(resource)
  const timeout = cfg.input.timeout || (1 * 60 * 1000) // 5 minutes.
  try {
    await poll({ request, timeout, interval: 500 })
  } catch (err) {
    if (err?.response?.statusCode === 404) {
      logger.debug('waitForDelete', err.response.body)
    } else {
      logger.error('waitForDelete', err?.response?.body || err)
    }
  }
}

export default async function del (input) {
  const cfg = input.input ? input : await configure(input)
  const { namespace } = cfg
  const cluster = chalk.yellow(kc.currentContext)
  const hasArgs = input.args?.length

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
      process.stdout.write('\n')

      // Delete the given app's resources from the cluster.
      await Promise.all(resources.map(async resource => {
        try {
          // Delete the resource from the cluster.
          await k8s.client.delete(resource)

          // Wait until the resource is completely deleted.
          if (cfg.input.wait) await waitForDelete(cfg, resource)
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
      process.stdout.write('\n')

      // Delete the namespace from the cluster.
      const byNs = r => r.kind === 'Namespace' && r.metadata.name === namespace
      const ns = cfg.resources.find(byNs)
      await k8s.client.delete(ns)

      // Wait until the resource is completely deleted.
      if (cfg.input.wait) await waitForDelete(cfg, ns)
    } else {
      logger.error('No apps specified and cannot delete default namespace')
      process.exit(1)
    }
  } catch (err) {
    const msg = err?.message
    logger.warn(`Error thrown during delete${msg ? ':' : ''}`, msg)
    logger.debug(err)
    process.stdout.write('\n')
    return
  }

  const action = cfg.input.wait ? 'deleted' : 'deleting'
  const target = hasArgs ? 'resources' : 'namespace'
  logger.success(`Successfully ${action} ${target}`)
  process.stdout.write('\n')
}
