import { createLogger, chalk } from '@generates/logger'
import emojis from '../emojis.js'
import getResources from '../getResources.js'

const logger = createLogger({ namespace: 'kdot.show', level: 'info' })

async function showResource (resource) {
  const status = resource.metadata.uid
    ? chalk.green('Existing')
    : chalk.dim('Unknown')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${status} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

export default async function show (cfg) {
  const resources = await getResources(cfg)

  try {
    process.stdout.write('\n')
    await Promise.all(Object.entries(cfg.apps).map(async ([name]) => {
      for (const resource of resources.filter(r => r.app?.name === name)) {
        await showResource(resource)
      }
    }))
    process.stdout.write('\n')
  } catch (err) {
    logger.error(err)
  }
}
