import { createLogger } from '@generates/logger'
import * as dotter from '@generates/dotter'
import configure from '../configure/index.js'

const logger = createLogger({ namespace: 'kdot', level: 'info' })

export default async function get (input) {
  const cfg = input.input ? input : await configure(input)
  const [path] = cfg.input.args || []
  const fullPath = 'cfg' + (path ? `.${path}` : '')
  logger.info(fullPath, dotter.get(cfg, cfg.input.args[0]))
}
