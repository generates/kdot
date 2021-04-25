export default function getTargetApps (cfg) {
  const byTarget = cfg.input.args?.length ? a => a.isSpecified : a => a.enabled
  return Object.values(cfg.apps).filter(byTarget)
}
