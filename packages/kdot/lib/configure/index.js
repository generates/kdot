import { createRequire } from 'module'
import path from 'path'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { core, apps } from '../k8sApi.js'
import configureSecrets from './secrets.js'

const require = createRequire(import.meta.url)
const logger = createLogger({ namespace: 'kdot.configure', level: 'info' })
const labels = { managedBy: 'kdot' }

function toServicePort ({ localPort, ...port }) {
  return port
}

function toEnv ([name, value]) {
  if (typeof value === 'object') return { name, valueFrom: value }
  return { name, value }
}

export default async function configure ({ ext, ...input }) {
  const cfg = { input, namespace: 'default' }

  const configs = Array.isArray(input.config) ? input.config : [input.config]
  for (const config of configs) {
    const dirname = path.dirname(config)
    const basename = path.basename(config)
    const js = path.resolve(dirname, `k.${basename}.js`)
    const json = path.resolve(dirname, `k.${basename}.json`)

    try {
      const mod = await import(js)
      merge(cfg, mod.default)
    } catch (err) {
      logger.debug('Error importing config file', err)
    }

    try {
      merge(cfg, require(json))
    } catch (err) {
      logger.debug('Error importing json config file', err)
    }
  }

  logger.debug('Initial configuration', cfg)

  // Initialize the array of resources.
  cfg.resources = []

  // If there is a top-level namespace, add it to the resources array.
  cfg.namespaces = []
  if (cfg.namespace !== 'default') {
    const metadata = { name: cfg.namespace, labels }
    const namespace = { kind: 'Namespace', metadata }
    cfg.namespaces.push(namespace)
  }

  // Configure top-level secrets.
  cfg.secrets = configureSecrets(cfg)

  // Break apps down into individual Kubernetes resources.
  cfg.activeApps = []
  cfg.deployments = []
  cfg.services = []
  for (const [name, app] of Object.entries(cfg.apps)) {
    const enabled = app.enabled !== false && input.args.length === 0
    if (enabled || input.args.includes(name)) {
      cfg.activeApps.push({ name, ...app })

      // If a namespace isn't specified for the app, assign the top-level
      // namespace to it.
      if (!app.namespace) app.namespace = cfg.namespace

      // If there is a app-level namespace that is different from the
      // top-level namespace, add it to the resources array.
      if (app.namespace !== cfg.namespace) {
        const metadata = { name: app.namespace, labels }
        const namespace = { kind: 'Namespace', metadata }
        cfg.namespaces.push(namespace)
      }

      const appLabel = { app: name }

      // Configure app-level secrets and secret references.
      if (app.secrets) cfg.secrets.push(...configureSecrets(app, true))

      let env
      if (app.env) env = Object.entries(app.env).map(toEnv)

      const deployment = {
        kind: 'Deployment',
        metadata: {
          name,
          namespace: app.namespace,
          labels: { ...labels, ...appLabel }
        },
        spec: {
          replicas: app.replicas || 1,
          selector: { matchLabels: appLabel },
          template: {
            metadata: { labels: { ...labels, ...appLabel } },
            spec: {
              containers: [
                {
                  name,
                  image: `${app.image.repo}:${app.image.tag || 'latest'}`,
                  ports: app.ports?.map(p => ({ containerPort: p.port })),
                  env
                }
              ]
            }
          }
        }
      }
      cfg.deployments.push(deployment)

      if (app.ports?.length) {
        const service = {
          kind: 'Service',
          metadata: { name, namespace: app.namespace, labels },
          spec: { selector: appLabel, ports: app.ports.map(toServicePort) }
        }
        cfg.services.push(service)
      }
    }
  }

  if (cfg.namespaces.length) {
    const { body: { items } } = await core.listNamespace()
    for (const namespace of cfg.namespaces) {
      const { name } = namespace.metadata
      const existing = items.find(n => n.metadata.name === name)
      cfg.resources.push(existing || namespace)
    }
  }

  if (cfg.deployments.length) {
    const { body: { items } } = await apps.listDeploymentForAllNamespaces()
    for (const deployment of cfg.deployments) {
      const { name, namespace } = deployment.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      cfg.resources.push(merge({}, existing, deployment))
    }
  }

  if (cfg.services.length) {
    const { body: { items } } = await core.listServiceForAllNamespaces()
    for (const service of cfg.services) {
      const { name, namespace } = service.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      cfg.resources.push(merge({}, existing, service))
    }
  }

  if (cfg.secrets.length) {
    for (const secret of cfg.secrets) {
      const { name, namespace } = secret.metadata
      const { body: { items } } = await core.listNamespacedSecret(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (!existing) cfg.resources.push(secret)
    }
  }

  return cfg
}
