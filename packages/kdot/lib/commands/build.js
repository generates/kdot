import { createLogger } from '@generates/logger'
import { stripIndent } from 'common-tags'
import { including } from '@generates/extractor'
import { merge } from '@generates/merger'
import { k8s, V1Container } from '../k8s.js'
import getPods from '../getPods.js'
import poll from '../poll.js'
import configureNamespaces from '../configure/namespaces.js'
import encode from '../encode.js'
import toEnv from '../toEnv.js'
import apply from './apply.js'
import getBuildContext from '../getBuildContext.js'
import configure from '../configure/index.js'
import streamPodLogs from '../streamPodLogs.js'

const defaultDigest = '/dev/termination-log'
const logger = createLogger({ namespace: 'kdot.build', level: 'info' })
const byPod = resource => resource.kind === 'Pod'
const containerAttrs = V1Container.attributeTypeMap.map(a => a.name)

export default async function build (input) {
  const cfg = input.input ? input : await configure(input)

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
      data: { 'config.json': encode(cfg.build.gcr) }
    })
    volumes.push({ name, secret: { secretName: name } })
    volumeMounts.push({ name, mountPath: '/kaniko/gcr', readOnly: true })
    env.GOOGLE_APPLICATION_CREDENTIALS = '/kaniko/gcr/config.json'
  }

  const bySpecified = input.args?.length ? a => a.isSpecified : a => a.enabled
  for (const app of Object.values(cfg.apps).filter(bySpecified)) {
    if (app.build) {
      const buildContext = await getBuildContext(app.build.context)
      logger.debug('Context:', buildContext)

      const contextSubPath = `--context-sub-path=${app.build.contextSubPath}`

      // Deconstruct the build args so that they can be overridden if necessary.
      const {
        dockerfile = `--dockerfile=${app.build.dockerfile || 'Dockerfile'}`,
        context = `--context=${buildContext}`,
        destination = app.taggedImages.map(image => `--destination=${image}`),
        digestFile = `--digest-file=${app.build.digestFile || defaultDigest}`,
        skipUnusedStaged = '--skip-unused-stages',
        cache = '--cache=true',
        ...args
      } = app.build.args || {}

      // Create the pod configuration.
      const [firstTag] = app.image?.tags || []
      const tag = app.image?.tag || firstTag || 'latest'
      const name = app.build.id || `build-${app.name}-${tag}`
      logger.debug('Build pod:', name)
      build.resources.push({
        app,
        kind: 'Pod',
        metadata: { namespace, name, labels: { app: name } },
        spec: {
          restartPolicy: 'Never',
          containers: [
            merge(
              {
                name: `build-${app.name}`,
                image: 'gcr.io/kaniko-project/executor',
                args: [
                  ...dockerfile ? [dockerfile] : [],
                  ...context ? [context] : [],
                  ...app.build.contextSubPath ? [contextSubPath] : [],
                  ...destination || [],
                  ...digestFile ? [digestFile] : [],
                  ...skipUnusedStaged ? [skipUnusedStaged] : [],
                  ...cache ? [cache] : [],
                  ...args ? Object.values(args) : []
                ],
                env: Object.entries(env).map(toEnv),
                volumeMounts,
                resources: {
                  requests: { cpu: '1', memory: '1Gi' }
                }
              },
              including(cfg.build, ...containerAttrs)
            )
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

  // Don't update existing resources when running apply through build unless
  // explicitly specified.
  if (cfg.input.update === undefined) cfg.input.update = false

  // Create the build pods and associated resources.
  await apply(build)

  // Wait for the build pod to complete.
  await Promise.all(pods.map(async pod => {
    const { app, metadata } = pod

    // Wait for the build pod to enter the Running state.
    const request = () => getPods(metadata.namespace, metadata.name, 1)
    const condition = pod => pod?.status?.phase === 'Running'
    await poll({ request, condition, interval: 500 })

    // Stream the build pod logs to stdout.
    try {
      const logStream = resolve => streamPodLogs({ ...metadata, done: resolve })
      await new Promise(logStream)
    } catch (err) {
      logger.error('Streaming logs failed', err)
    }

    // Add a blank line between before the build log and result message.
    process.stdout.write('\n')

    // Wait for the pod to go from Running to Failed or Succeeded state.
    const finishedRunning = pod => pod?.status?.phase !== 'Running'
    await poll({ request, condition: finishedRunning, interval: 250 })

    // Determine the result of the build from the status of the build pod.
    const buildPod = await request()
    const [status] = buildPod.status.containerStatuses || []
    if (status && buildPod.status.phase === 'Succeeded') {
      // Delete the build pod now that it has completed successfully.
      await k8s.client.delete(pod)

      // Log the built image information.
      const digest = status.state.terminated.message.split(':')
      logger.success(`Built ${app.taggedImage} for ${app.name}: ${digest[1]}`)
    } else {
      // Don't delete the build pod in case it needs to be inspected.
      const message = `Build ${app.taggedImage} failed for ${app.name}:`
      logger.fatal(message, buildPod.status)
      process.exit(1)
    }

    process.stdout.write('\n')
  }))
}
