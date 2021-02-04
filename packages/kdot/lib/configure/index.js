import { createRequire } from 'module'
import path from 'path'
import { merge } from '@generates/merger'
import { createLogger } from '@generates/logger'
import { including } from '@generates/extractor'
import { V1Container } from '@kubernetes/client-node'
import configureConfigMaps from './configMaps.js'
import configureSecrets from './secrets.js'
import configurePriorityClass from './priorityClass.js'
import configureNamespaces from './namespaces.js'
import configureRoles from './roles.js'
import { configureClients } from '../k8s.js'

const require = createRequire(import.meta.url)
const logger = createLogger({ namespace: 'kdot.configure', level: 'info' })
const labels = { managedBy: 'kdot' }
const containerAttrs = V1Container.attributeTypeMap.map(a => a.name)

function toServicePort ({ localPort, ...port }) {
  return port
}

function toEnv ([name, value]) {
  if (typeof value === 'object') return { name, valueFrom: value }
  return { name, value }
}

function taggedImage () {
  return !this.image || typeof this.image === 'string'
    ? this.image
    : `${this.image.repo}:${this.image.tag || 'latest'}`
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

  // Re-initialize clients with the given context if sepcified.
  if (cfg.context) configureClients(cfg.context)

  // Initialize the collection of resources.
  cfg.resources = cfg.resources || []

  // If there is a top-level namespace, add it to the resources array.
  if (cfg.namespace !== 'default') configureNamespaces(cfg)

  // Configure top-level secrets.
  if (cfg.secrets) configureSecrets(cfg)

  // Break apps down into individual Kubernetes resources.
  for (const [name, app] of Object.entries(cfg.apps)) {
    const enabled = app.enabled !== false && input.args.length === 0

    // Determien if this app is being depended on by another specified app.
    const hasDependency = n => cfg.apps[n]?.dependsOn?.includes(name)
    app.isDependency = input.args.some(hasDependency)

    if (enabled || input.args.includes(name) || app.isDependency) {
      // Mark the app as being enabled.
      app.enabled = true

      // If a namespace isn't specified for the app, assign the top-level
      // namespace to it.
      if (!app.namespace) app.namespace = cfg.namespace

      // Set app name to the key that was used to define it.
      app.name = name

      // Create the app label so that resources can be filtered by app name.
      const appLabel = { app: name }

      // If there is a app-level namespace that is different from the
      // top-level namespace, add it to the resources array.
      if (app.namespace !== cfg.namespace) configureNamespaces(cfg, app)

      // Configure app-level ConfigMaps and ConfigMap Volumes.
      if (app.configMaps) await configureConfigMaps(cfg, app)

      // Configure app-level Secrets and Secret references.
      if (app.secrets) configureSecrets(cfg, app)

      // Configure app-level Roles, ServiceAccounts, and RoleBindings.
      if (app.roles) configureRoles(cfg, app)

      // Map environment variables from key-value pairs to Objects in an Array.
      if (app.env) app.env = Object.entries(app.env).map(toEnv)

      // Add PriorityClass resources if the app has a priority assigned to it.
      const hasPriority = Number.isInteger(app.priority)
      if (hasPriority) configurePriorityClass(cfg, app)

      // Add the taggedImage getter to the app object for convenience.
      Object.defineProperty(app, 'taggedImage', { get: taggedImage })

      cfg.resources.push({
        app,
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: {
          name,
          namespace: app.namespace,
          labels: { ...labels, ...appLabel }
        },
        spec: {
          replicas: Number.isInteger(app.replicas) ? app.replicas : 1,
          selector: { matchLabels: appLabel },
          ...app.deployStrategy && { strategy: { type: app.deployStrategy } },
          template: {
            metadata: { labels: { ...labels, ...appLabel } },
            spec: {
              ...app.role ? { serviceAccountName: app.role.name || name } : {},
              containers: [
                {
                  ...including(app, ...containerAttrs),
                  name,
                  image: app.taggedImage,
                  ports: app.ports?.map(p => ({ containerPort: p.port }))
                }
              ],
              ...app.volumes ? { volumes: app.volumes } : {},
              ...hasPriority
                ? { priorityClassName: `priority-${app.priority}` }
                : {}
            }
          }
        }
      })

      if (app.ports?.length) {
        const service = {
          app,
          kind: 'Service',
          metadata: { name, namespace: app.namespace, labels },
          spec: { selector: appLabel, ports: app.ports.map(toServicePort) }
        }

        // Merge in any additional service properties specified on the app
        // (e.g. type).
        merge(service, app.service)

        cfg.resources.push(service)

        const hostPorts = app.ports.filter(p => p.hosts)
        if (hostPorts.length) {
          const clusterIssuer = cfg.clusterIssuer || 'kdot-cluster-issuer'
          const metadata = {
            name,
            namespace: app.namespace,
            labels,
            annotations: { 'cert-manager.io/cluster-issuer': clusterIssuer }
          }
          const spec = { rules: [], tls: [] }
          const ingress = { app, kind: 'Ingress', metadata, spec }

          for (const p of hostPorts) {
            const pathType = p.pathType || 'Prefix'
            const service = { name, port: { number: p.port } }
            const path = { path: p.path || '/', pathType, backend: { service } }
            for (const host of p.hosts) {
              ingress.spec.rules.push({ host, http: { paths: [path] } })
            }

            // Configure the TLS settings for cert-manager.
            const secretName = `${name}${p.name ? `-${p.name}` : ''}-cert`
            ingress.spec.tls.push({ hosts: p.hosts, secretName })
          }

          cfg.resources.push(ingress)
        }
      }

      if (app.custom?.length) {
        for (const custom of app.custom) custom.app = app
        cfg.resources = cfg.resources.concat(app.custom)
      }
    }
  }

  if (cfg.custom?.length) cfg.resources = cfg.resources.concat(cfg.custom)

  return cfg
}
