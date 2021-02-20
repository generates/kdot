#!/usr/bin/env node

import { createLogger } from '@generates/logger'
import cli from '@generates/cli'
import * as kdot from './index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.cli' })

cli({
  name: 'kdot',
  description: 'A tool for managing apps on Kubernetes',
  usage: 'kdot [command] [apps] [options]',
  commands: {
    apply: {
      execute: kdot.apply,
      description: `
        Create or update resources in a cluster for a given configuration
      `,
      options: {
        prompt: {
          alias: 'p',
          description: `
            Whether to show a confirmation prompt before applying resources
          `,
          default: true
        },
        failFast: {
          alias: 'f',
          description: 'Whether to exit on the first failure encountered',
          default: false
        },
        wait: { alias: 'w' }
      }
    },
    start: {
      execute: kdot.start,
      description: `
        Facilitate local development by applying resources, streaming logs, and
        forwarding ports so that resources can be used locally
      `,
      options: {
        update: {
          alias: 'u',
          description: `
            Whether to update resources before streaming logs and forwarding
            ports
          `
        }
      }
    },
    forward: {
      aliases: ['fwd'],
      execute: kdot.fwd,
      description: `
        Forward local ports to apps in the cluster for a given configuration
      `
    },
    logs: {
      aliases: ['log'],
      execute: kdot.log,
      description: `
        Stream logs from apps in the cluster for a given configuration to stdout
      `
    },
    stop: {
      execute: kdot.stop,
      description: `
        Stop forwarding ports and streaming logs when start was run in detached
        mode (in development)
      `
    },
    show: {
      execute: kdot.show,
      description: `
        Show a list of resources in the cluster for a given configuration that
        is configured by kdot
      `
    },
    scale: {
      execute: kdot.scale,
      description: `
        Scale up or down the number of replicas for an app in the cluster (in
        development)
      `
    },
    delete: {
      aliases: ['del'],
      execute: kdot.del,
      description: `
        Delete a namespace or resources for a given app in the cluster for a
        given configuration
      `,
      options: {
        prompt: {
          alias: 'p',
          description: `
            Whether to show a confirmation prompt before deleting resources
          `,
          default: true
        }
      }
    },
    build: {
      execute: kdot.build,
      description: `
        Build container images in the cluster using Kaniko for apps in a given
        configuration
      `,
      options: {
        timeout: {
          alias: 't'
        }
      }
    },
    copy: {
      description: `
        Copy files locally from a container belonging to an app running in the
        cluster for a given configuration
      `,
      aliases: ['cp'],
      execute: kdot.cp
    },
    cleanup: {
      aliases: ['clean'],
      execute: kdot.clean,
      description: 'Delete failed pods in a namespace for a given configuration'
    },
    set: {
      execute: kdot.set,
      description: 'Set a configuration value for a given configuration',
      options: {
        prop: {
          description: ''
        }
      }
    },
    get: {
      execute: kdot.get,
      description: 'Log a configuration value for a given configuration',
      options: {
        prop: {
          description: ''
        }
      }
    }
  },
  options: {
    config: {
      alias: 'c',
      description: 'The name of the config to use',
      default: 'personal'
    },
    ext: {
      alias: 'e',
      description: 'Extend/override a config value using dot notation',
      default: {}
    }
  }
})
  .then(input => {
    if (input?.helpText) {
      process.stdout.write('\n')
      logger.info(input.helpText)
      process.exit(1)
    }
  })
  .catch(err => {
    logger.fatal(err)
    process.exit(1)
  })
