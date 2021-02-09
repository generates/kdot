import { createLogger } from '@generates/logger'
import { stripIndent } from 'common-tags'
import { k8s } from '../k8s.js'
import getPods from '../getPods.js'
import poll from '../poll.js'
import configureNamespaces from '../configure/namespaces.js'
import encode from '../encode.js'
import toEnv from '../toEnv.js'
import apply from '../apply.js'

const statuses = ['Succeeded', 'Failed']
const defaultDigest = '/dev/termination-log'
const logger = createLogger({ namespace: 'kdot.build', level: 'info' })
const byPod = resource => resource.kind === 'Pod'

export default async function build (cfg) {
  // Configure the build config object.
  const namespace = cfg.build.namespace || cfg.namespace
  const build = { ...cfg, namespace, resources: [] }

  // Configure the namespace that will be used for the build.
  configureNamespaces(build)

  const env = {}
  if (cfg.build.gitToken) {
    // Create a secret for the git token.
    const name = 'git-token'
    const metadata = { namespace, name }
    const data = { GIT_TOKEN: encode(cfg.build.gitToken) }
    build.resources.push({ kind: 'Secret', metadata, data })

    // Reference the git-token secret in the build pod's environment.
    env.GIT_TOKEN = { secretKeyRef: { name, key: 'GIT_TOKEN' } }
  }

  const volumes = []
  const volumeMounts = []
  if (cfg.build.registryToken || (cfg.build.user && cfg.build.pass)) {
    const name = 'registry-credentials'
    const creds = `${cfg.build.user}:${cfg.build.pass}`
    build.resources.push({
      kind: 'Secret',
      metadata: { namespace, name },
      data: {
        'config.json': encode(stripIndent`
          {
            "auths": {
              "${cfg.build.registry || 'https://index.docker.io/v1/'}": {
                "auth": "${cfg.build.registryToken || encode(creds)}"
              }
            }
          }
        `)
      }
    })
    volumes.push({ name, secret: { secretName: name } })
    volumeMounts.push({ name, mountPath: '/kaniko/.docker/', readOnly: true })
  } else if (cfg.build.gcr) {
    const name = 'gcr-credentials'
    build.resources.push({
      kind: 'Secret',
      metadata: { namespace, name },
      data: { 'config.json': cfg.build.gcr }
    })
    volumes.push({ name, secret: { secretName: name } })
    volumeMounts.push({ name, mountPath: '/kaniko/', readOnly: true })
    env.GOOGLE_APPLICATION_CREDENTIALS = '/kaniko/config.json'
  }

  for (const app of Object.values(cfg.apps).filter(app => app.enabled)) {
    if (app.build) {
      const buildContext = app.build.context
      const ref = buildContext.ref ? `#refs/heads/${buildContext.ref}` : ''
      const sha = buildContext.sha ? `#${buildContext.sha}` : ''
      const contextValue = `${buildContext.repo}${ref}${sha}`
      logger.debug('Context:', contextValue)

      // Deconstruct the build args so that they can be overridden if necessary.
      const {
        dockerfile = `--dockerfile=${app.build.dockerfile || 'Dockerfile'}`,
        context = `--context=${contextValue}`,
        destination = `--destination=${app.taggedImage}`,
        digestFile = `--digest-file=${app.build.digestFile || defaultDigest}`,
        skipUnusedStaged = '--skip-unused-stages',
        cache = '--cache=true',
        ...args
      } = app.build.args || {}

      // Create the pod configuration.
      const shaName = buildContext.sha ? `-${buildContext.sha}` : ''
      const name = `build-${app.name}${shaName}`
      logger.debug('Build pod:', name)
      build.resources.push({
        app,
        kind: 'Pod',
        metadata: { namespace, name, labels: { app: name } },
        spec: {
          restartPolicy: 'Never',
          containers: [
            {
              name: `build-${app.name}`,
              image: 'gcr.io/kaniko-project/executor',
              args: [
                ...dockerfile ? [dockerfile] : [],
                ...context ? [context] : [],
                ...destination ? [destination] : [],
                ...digestFile ? [digestFile] : [],
                ...skipUnusedStaged ? [skipUnusedStaged] : [],
                ...cache ? [cache] : [],
                ...args ? Object.values(args) : []
              ],
              env: Object.entries(env).map(toEnv),
              volumeMounts
            }
          ],
          volumes
        }
      })
    }
  }

  // Create an array of pods to be created.
  const pods = build.resources.filter(byPod)

  // Delete any existing build pods.
  await Promise.allSettled(pods.map(pod => k8s.client.delete(pod)))

  // Create the build pods and associated resources.
  await apply(build)

  // Add a blank line between before the building log message.
  process.stdout.write('\n')

  // Wait for the build pod to complete.
  await Promise.all(pods.map(async pod => {
    const { app, metadata } = pod

    logger.info(`Building ${app.name}...`)

    const request = () => getPods(metadata.namespace, metadata.name, 1)
    const condition = pod => statuses.includes(pod?.status?.phase)
    const buildPod = await poll({ request, condition, interval: 2000 })

    const { state } = buildPod.status.containerStatuses[0]
    if (buildPod.status.phase === 'Succeeded') {
      // Delete the build pod now that it has completed successfully.
      await k8s.client.delete(pod)

      // Log the built image information.
      const digest = state.terminated.message.split(':')
      logger.success(`Built ${app.taggedImage} for ${app.name}: ${digest[1]}`)
    } else {
      logger.fatal(`Build ${app.taggedImage} failed for ${app.name}:`, state)

      // TODO: OUTPUT BUILD POD LOG

      process.exit(1)
    }
  }))
}
