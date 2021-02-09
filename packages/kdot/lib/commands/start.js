import apply from './apply.js'
import log from './log.js'
import fwd from './fwd.js'

export default async function start (cfg) {
  // Don't update existing resources when running apply through start unless
  // explicitly specified.
  if (cfg.input.update === undefined) cfg.input.update = false

  await apply(cfg)
  await log(cfg)
  await fwd(cfg)
}
