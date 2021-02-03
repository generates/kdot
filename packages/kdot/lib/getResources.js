import { createLogger } from '@generates/logger'
import { merge } from '@generates/merger'
import got from 'got'
import pReduce from 'p-reduce'
import { k8s, loadAllYaml } from './k8s.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const toMeta = r => r.metadata

export default async function getResources (cfg, filter) {
  let resources = []

  if (!filter) filter = r => r

  if (cfg.externalResources?.length) {
    for (const url of cfg.externalResources) {
      logger.debug('Getting external resource', url)

      try {
        // Fetch the yaml text.
        const response = await got(url)

        // Convert the yaml text into Kubernetes resource objects.
        const externalResources = loadAllYaml(response.body)
        logger.debug('Got external resources', externalResources.map(toMeta))

        // Add the external resources to the collection of all resources.
        resources = resources.concat(externalResources)
      } catch (err) {
        logger.error(err)
      }
    }
  }

  resources = await pReduce(
    cfg.resources,
    async (acc, resource) => {
      try {
        // Fetch the existing resource from Kubernetes if it exists.
        const { body } = await k8s.client.read(resource)

        // Merge the existing config with the configured resource.
        merge(resource, body)

        logger.debug('Found existing resource', resource.metadata)
      } catch (err) {
        logger.debug('Existing resource not found', resource.metadata)
      }

      // If the resource isn't filtered out, add it to the colleciton of
      // resources.
      if (filter(resource)) acc.push(resource)

      return acc
    },
    []
  )

  logger.debug('getResources', resources)

  return resources
}
