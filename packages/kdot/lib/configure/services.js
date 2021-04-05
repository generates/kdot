import { merge } from '@generates/merger'

const labels = { managedBy: 'kdot' }
const toServicePorts = (acc, [name, { localPort, reversePort, ...rest }]) => {
  return acc.concat([{ name, ...rest }])
}

export default async function configureServices (cfg, owner) {
  if (owner?.ports) {
    // Configure an app's main service.
    const { namespace, name } = owner
    const ports = Object.entries(owner.ports).reduce(toServicePorts, [])
    const spec = { selector: { app: name }, ports }
    const metadata = { namespace, name, labels }
    const service = { kind: 'Service', app: owner, metadata, spec }

    // Merge in any additional service properties specified on the app
    // (e.g. type).
    merge(service, owner.service)

    cfg.resources.push(service)
  } else if (cfg.services) {
    // Configure top-level services.
    for (const [name, given] of Object.entries(cfg.services)) {
      const app = given.app && cfg.apps[given.app]

      let ports = given.ports
      if (!ports && given.app) {
        ports = Object.entries(app.ports).reduce(toServicePorts, [])
      } else {
        throw new Error('No app or port config given for service:', name)
      }

      let selector = given.selector
      if (!selector && given.app) {
        selector = { app: given.app }
      } else {
        throw new Error('No app or selector config given for service:', name)
      }

      const namespace = given.namespace || app.namespace || cfg.namespace
      const metadata = { name, namespace, labels }
      const service = { kind: 'Service', metadata, spec: { selector, ports } }
      cfg.resources.push(service)
    }
  }
}
