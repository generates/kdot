import { createLogger, chalk } from '@generates/logger'
import emojis from '../emojis.js'

const logger = createLogger({ namespace: 'kdot.show', level: 'info' })

async function showResource (cfg, resource) {
  const status = resource.metadata.uid
    ? chalk.green('Created')
    : chalk.dim('Uknown')
  const name = chalk.yellow(resource.metadata.name)
  const message = `${status} ${resource.kind}: ${name}`
  logger.log(emojis[resource.kind] || emojis.k8, message)
}

export default async function show (cfg) {
  const resources = cfg.input.args.length
    ? cfg.resources.all.filter(r => cfg.input.args.includes(r.app?.name))
    : cfg.resources.all

  try {
    process.stdout.write('\n')
    await Promise.all(Object.entries(cfg.apps).map(async ([name]) => {
      for (const resource of resources.filter(r => r.app?.name === name)) {
        await showResource(cfg, resource)
      }
    }))
    process.stdout.write('\n')
  } catch (err) {
    logger.error(err)
  }
}
