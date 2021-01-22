import { createRequire } from 'module'
import path from 'path'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { core, apps, net, sched } from '../k8sApi.js'
import configureConfigMaps from './configMaps.js'
import configureSecrets from './secrets.js'
import configurePriorityClass from './priorityClass.js'

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

  // Initialize the map of resources.
  cfg.resources = { all: [], namespaces: [], deployments: [], services: [] }

  // If there is a top-level namespace, add it to the resources array.
  if (cfg.namespace !== 'default') {
    const metadata = { name: cfg.namespace, labels }
    const namespace = { kind: 'Namespace', metadata }
    cfg.resources.namespaces.push(namespace)
  }

  // Configure top-level secrets.
  if (cfg.secrets) configureSecrets(cfg)

  // Break apps down into individual Kubernetes resources.
  for (const [name, app] of Object.entries(cfg.apps)) {
    const enabled = app.enabled !== false && input.args.length === 0
    if (enabled || input.args.includes(name)) {
      // If a namespace isn't specified for the app, assign the top-level
      // namespace to it.
      if (!app.namespace) app.namespace = cfg.namespace

      //
      const {
        namespace,
        configMaps,
        secrets,
        env,
        priority,
        replicas = 1,
        image,
        ports,
        volumes,
        ...rest
      } = app

      //
      app.enabled = true

      // Set app name to the key that was used to define it.
      app.name = name

      // If there is a app-level namespace that is different from the
      // top-level namespace, add it to the resources array.
      if (namespace !== cfg.namespace) {
        const metadata = { name: app.namespace, labels }
        const namespace = { kind: 'Namespace', metadata }
        cfg.resources.namespaces.push(namespace)
      }

      const appLabel = { app: name }

      // Configure app-level ConfigMaps and ConfigMap Volumes.
      if (configMaps) await configureConfigMaps(cfg, app)

      // Configure app-level Secrets and Secret references.
      if (secrets) configureSecrets(cfg, app)

      // Map environment variables from key-value pairs to Objects in an Array.
      if (app.env) app.env = Object.entries(app.env).map(toEnv)

      //
      const hasPriority = Number.isInteger(priority)
      if (hasPriority) configurePriorityClass(cfg, app)

      cfg.resources.deployments.push({
        kind: 'Deployment',
        metadata: {
          name,
          namespace: app.namespace,
          labels: { ...labels, ...appLabel }
        },
        spec: {
          replicas,
          selector: { matchLabels: appLabel },
          template: {
            metadata: { labels: { ...labels, ...appLabel } },
            spec: {
              containers: [
                {
                  name,
                  image: typeof image === 'string'
                    ? image
                    : `${image.repo}:${image.tag || 'latest'}`,
                  ports: ports?.map(p => ({ containerPort: p.port })),
                  ...rest
                }
              ],
              ...volumes ? { volumes } : {},
              ...hasPriority
                ? { priorityClassName: `priority-${app.priority}` }
                : {}
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
        cfg.resources.services.push(service)

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

          cfg.resources.ingresses = cfg.resources.ingresses || []
          cfg.resources.ingresses.push(ingress)
        }
      }
    }
  }

  if (cfg.resources.namespaces.length) {
    const { body: { items } } = await core.listNamespace()
    for (const namespace of cfg.resources.namespaces) {
      const { name } = namespace.metadata
      const existing = items.find(n => n.metadata.name === name)
      if (!existing) cfg.resources.all.push(namespace)
    }
  }

  if (cfg.resources.configMaps?.length) {
    for (const configMap of cfg.resources.configMaps) {
      const { name, namespace } = configMap.metadata
      const { body: { items } } = await core.listNamespacedConfigMap(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) configMap.metadata.uid = existing.metadata.uid
      cfg.resources.all.push(configMap)
    }
  }

  if (cfg.resources.secrets?.length) {
    for (const secret of cfg.resources.secrets) {
      const { name, namespace } = secret.metadata
      const { body: { items } } = await core.listNamespacedSecret(namespace)
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) secret.metadata.uid = existing.metadata.uid
      cfg.resources.all.push(secret)
    }
  }

  if (cfg.resources.priorityClasses?.length) {
    const { body: { items } } = await sched.listPriorityClass()
    for (const priorityClass of cfg.resources.priorityClasses) {
      const { name } = priorityClass.metadata
      const existing = items.find(i => i.metadata.name === name)
      if (!existing) cfg.resources.all.push(priorityClass)
    }
  }

  if (cfg.resources.deployments.length) {
    const { body: { items } } = await apps.listDeploymentForAllNamespaces()
    for (const deployment of cfg.resources.deployments) {
      const { name, namespace } = deployment.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) deployment.metadata.uid = existing.metadata.uid
      cfg.resources.all.push(deployment)
    }
  }

  if (cfg.resources.services.length) {
    const { body: { items } } = await core.listServiceForAllNamespaces()
    for (const service of cfg.resources.services) {
      const { name, namespace } = service.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) service.metadata.uid = existing.metadata.uid
      cfg.resources.all.push(service)
    }
  }

  if (cfg.resources.ingresses?.length) {
    const { body: { items } } = await net.listIngressForAllNamespaces()
    for (const ingress of cfg.resources.ingresses) {
      const { name, namespace } = ingress.metadata
      const existing = items.find(i => {
        return i.metadata.name === name && i.metadata.namespace === namespace
      })
      if (existing) ingress.metadata.uid = existing.metadata.uid
      cfg.resources.all.push(ingress)
    }
  }

  logger.debug('Resources configuration', cfg.resources)

  return cfg
}
