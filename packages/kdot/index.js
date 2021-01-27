import apply from './lib/apply.js'
import fwd from './lib/fwd.js'
import log from './lib/log.js'
import show from './lib/commands/show.js'
import del from './lib/del.js'
import set from './lib/commands/set.js'
import get from './lib/get.js'
import build from './lib/commands/build.js'

export {
  apply,
  fwd,
  log,
  show,
  del,
  set,
  get,
  build
}

export async function start (cfg) {
  // Don't update existing resources when running apply through start unless
  // explicitly specified.
  if (cfg.input.update === undefined) cfg.input.update = false

  await apply(cfg)
  await log(cfg)
  await fwd(cfg)
}
