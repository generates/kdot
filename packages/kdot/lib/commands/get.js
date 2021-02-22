import { createLogger } from '@generates/logger'
import * as dotter from '@generates/dotter'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

export default async function get (input) {
  const cfg = await configure(input)
  logger.info(`cfg.${input.args[0]}:`, dotter.get(cfg, input.args[0]))
}
