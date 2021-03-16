import { merge } from '@generates/merger'

const toServicePorts = (acc, [name, { localPort, reversePort, ...rest }]) => {
  acc.concat([{ name, ...rest }])
}

export default async function configureServices (cfg, app) {
  if (app.ports) {
    const { namespace, name } = app
    const ports = Object.entries(app.ports).reduce(toServicePorts, [])
    const spec = { selector: { app: name }, ports }
    const service = { kind: 'Service', metadata: { namespace, name }, spec }

    // Merge in any additional service properties specified on the app
    // (e.g. type).
    merge(service, app.service)

    if (app.services) {
      for (const [name, given] of Object.entries(app.services)) {
        cfg.resources.push(merge(given, service, { metadata: { name } }))
      }
    } else {
      cfg.resources.push(service)
    }
  }
}
