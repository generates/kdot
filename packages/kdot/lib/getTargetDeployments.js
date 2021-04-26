import getTargetApps from './getTargetApps.js'
import getResources from './getResources.js'

export default function getTargetDeployments (cfg) {
  const targetApps = getTargetApps(cfg)
  function isTargetDeployment (resource) {
    const isDeployment = resource.kind === 'Deployment'
    return isDeployment && targetApps.find(a => a.name === resource.app.name)
  }
  return getResources(cfg, isTargetDeployment)
}
