import { createLogger } from '@generates/logger'
import { merge } from '@generates/merger'
import got from 'got'
import pReduce from 'p-reduce'
import { client, loadAllYaml } from './k8s.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

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
        logger.debug('Got external resources', externalResources)

        //
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
        //
        const existing = await client.read(resource)

        //
        merge(resource, existing)
      } catch (err) {
        // Ignore the error since it just means the resource was not found.
      }

      //
      if (filter(resource)) acc.push(resource)

      return acc
    },
    []
  )

  logger.debug('getResources', resources)

  return resources
}
