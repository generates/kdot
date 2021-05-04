import { merge } from '@generates/merger'
import { including } from '@generates/extractor'
import configureConfigMaps from './configMaps.js'
import configureSecrets from './secrets.js'
import configurePriorityClass from './priorityClass.js'
import configureNamespaces from './namespaces.js'
import configureRoles from './roles.js'
import { configureClients, V1Container } from '../k8s.js'
import configureServices from './services.js'
import configureIngresses from './ingresses.js'
import load from '../load.js'
import configureEnv from './env.js'

const labels = { managedBy: 'kdot' }
const containerAttrs = V1Container.attributeTypeMap.map(a => a.name)

function toContainerPorts (ports) {
  if (ports) return Object.values(ports).map(p => ({ containerPort: p.port }))
}

function taggedImage () {
  const [firstTag] = this.image?.tags || []
  const tag = this.image?.tag || firstTag || 'latest'
  const isNotObject = !this.image || typeof this.image === 'string'
  return isNotObject ? this.image : `${this.image.repo}:${tag}`
}
function taggedImages () {
  const tags = this.image?.tags?.length
  if (tags) return this.image.tags.map(tag => `${this.image.repo}:${tag}`)
  return [this.taggedImage]
}

export default async function configure (input) {
  const cfg = { namespace: 'default', input }

  // Load config from config files.
  merge(cfg, await load(input.config))

  // Re-initialize clients with the given context if sepcified.
  if (cfg.context) configureClients(cfg.context)

  // Initialize the collection of resources.
  cfg.resources = cfg.resources || []

  // If there is a top-level namespace, add it to the resources array.
  if (cfg.namespace !== 'default') configureNamespaces(cfg)

  // Configure top-level secrets.
  if (cfg.secrets) configureSecrets(cfg)

  // Break apps down into individual Kubernetes resources.
  for (let [name, app] of Object.entries(cfg.apps || {})) {
    // If the app is a promise, use the value that is resolved instead.
    if (app.then) app = await app

    const enabled = app.enabled !== false && input.args?.length === 0

    // Mark the app if it was explicitly specified with the command.
    app.isSpecified = input.args?.includes(name)

    // Determine if this app is being depended on by another specified app.
    const hasDependency = n => cfg.apps[n]?.dependsOn?.includes(name)
    app.isDependency = input.args?.some(hasDependency)

    if (enabled || app.isSpecified || app.isDependency) {
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
      if (app.role) configureRoles(cfg, app)

      // Map environment variables from key-value pairs to Objects in an Array.
      if (app.env) configureEnv(app)

      // Add PriorityClass resources if the app has a priority assigned to it.
      const hasPriority = Number.isInteger(app.priority)
      if (hasPriority) configurePriorityClass(cfg, app)

      // Extract config for Pod imagePullSecrets.
      const imagePullSecret = app.imagePullSecret || cfg.imagePullSecret

      // Add the taggedImage getters to the app object for convenience.
      Object.defineProperty(app, 'taggedImage', { get: taggedImage })
      Object.defineProperty(app, 'taggedImages', { get: taggedImages })

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
                  ports: toContainerPorts(app.ports)
                }
              ],
              ...app.volumes ? { volumes: app.volumes } : {},
              ...hasPriority
                ? { priorityClassName: `priority-${app.priority}` }
                : {},
              ...imagePullSecret
                ? { imagePullSecrets: [{ name: imagePullSecret }] }
                : {}
            }
          }
        }
      })

      // Configure a service to act as a network interface for the app.
      configureServices(cfg, app)

      // Configure ingresses to expose the app to the internet.
      configureIngresses(cfg, app)
    }
  }

  // Configure top-level services.
  configureServices(cfg)

  return cfg
}
