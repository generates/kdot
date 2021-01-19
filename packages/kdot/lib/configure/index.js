import { createRequire } from 'module'
import path from 'path'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { core, apps, net } from '../k8sApi.js'
import configureConfigMaps from './configMaps.js'
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
  if (cfg.secrets) configureSecrets(cfg)

  // Break apps down into individual Kubernetes resources.
  cfg.activeApps = []
  cfg.deployments = []
  cfg.services = []
  cfg.ingresses = []
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

      // Map env key-value pairs into env objects.
      if (app.env) app.env = Object.entries(app.env).map(toEnv)

      // Configure app-level ConfigMaps and ConfigMap Volumes.
      if (app.configMaps) configureConfigMaps(cfg, app)

      // Configure app-level Secrets and Secret references.
      if (app.secrets) configureSecrets(cfg, app)

      cfg.deployments.push({
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
                  ...app.command ? { command: app.command } : {},
                  ...app.env ? { env: app.env } : {},
                  ...app.volumeMounts ? { volumeMounts: app.volumeMounts } : {}
                }
              ],
              ...app.volumes ? { volumes: app.volumes } : {}
            }
          }
        }
      })

      if (app.ports?.length) {
        const service = {
          kind: 'Service',
          metadata: { name, namespace: app.namespace, labels },
          spec: { selector: appLabel, ports: app.ports.map(toServicePort) }
        }
        cfg.services.push(service)

        const hostPorts = app.ports.filter(p => p.hosts)
        if (hostPorts.length) {
          const metadata = { name, namespace: app.namespace, labels }
          const spec = { rules: [] }
          const ingress = { kind: 'Ingress', metadata, spec }

          for (const p of hostPorts) {
            const pathType = p.pathType || 'Prefix'
            const service = { name, port: { number: p.port } }
            const path = { path: p.path || '/', pathType, backend: { service } }
            for (const host of p.hosts) {
              ingress.spec.rules.push({ host, http: { paths: [path] } })
            }
          }

          cfg.ingresses.push(ingress)
        }
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

  if (cfg.configMaps?.length) {
    for (const configMap of cfg.configMaps) {
      const { name, namespace } = configMap.metadata
      const { body: { items } } = await core.listNamespacedConfigMap(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) configMap.metadata.uid = existing.metadata.uid
    }
  }

  if (cfg.secrets?.length) {
    for (const secret of cfg.secrets) {
      const { name, namespace } = secret.metadata
      const { body: { items } } = await core.listNamespacedSecret(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (!existing) cfg.resources.push(secret)
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

  if (cfg.ingresses?.length) {
    const { body: { items } } = await net.listIngressForAllNamespaces()
    for (const ingress of cfg.ingresses) {
      const { name, namespace } = ingress.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      cfg.resources.push(merge({}, existing, ingress))
    }
  }

  return cfg
}
