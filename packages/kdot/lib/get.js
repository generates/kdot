import { createLogger } from '@generates/logger'
import * as dotter from '@generates/dotter'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

export default async function get (cfg) {
  try {
    logger.info(`cfg.${cfg.input.prop}:`, dotter.get(cfg, cfg.input.prop))
  } catch (err) {
    logger.error(err)
  }
}
