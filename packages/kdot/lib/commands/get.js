import { createLogger } from '@generates/logger'
import * as dotter from '@generates/dotter'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

export default async function get (input) {
  const cfg = input.input ? input : await configure(input)
  logger.info(`cfg.${cfg.input.args[0]}:`, dotter.get(cfg, cfg.input.args[0]))
}
