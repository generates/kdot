import { createLogger } from '@generates/logger'
import got from 'got'
import pReduce from 'p-reduce'
import extractor from '@generates/extractor'
import { k8s, loadAllYaml } from './k8s.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })
const toMeta = r => r.metadata
const toExtractedResource = r => {
  const props = ['app', 'data']
  if (r.kind === 'CustomResourceDefinition') props.push('spec')
  return extractor.excluding(r, ...props)
}
function byTruthy (resource) {
  return resource
}

export default async function getResources (cfg, filter = byTruthy) {
  let resources = cfg.resources

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
    resources,
    async (acc, resource) => {
      // Get a console-friendly representation of the resource.
      const rep = toExtractedResource(resource)

      try {
        // Fetch the existing resource from Kubernetes if it exists.
        const { body } = await k8s.client.read(resource)

        // Merge the existing config with the configured resource.
        resource.metadata.uid = body.metadata.uid

        logger.debug('Existing resource found', rep)
      } catch (err) {
        logger.debug('Existing resource not found', rep)
      }

      // Filter out resources based on the filter given by the caller.
      if (!filter(resource)) {
        logger.debug('Filtered out resource', filter.name, rep)
        return acc
      }

      // Add resource to the colleciton of resources.
      acc.push(resource)

      return acc
    },
    []
  )

  logger.debug('getResources', resources.map(toExtractedResource))

  return resources
}
