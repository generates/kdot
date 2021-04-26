#!/usr/bin/env node

import { createLogger } from '@generates/logger'
import cli from '@generates/cli'
import * as kdot from './index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.cli' })

const timeout = {
  aliases: ['t'],
  description: 'Amount of time in milliseconds to wait before erroring out'
}
const input = cli({
  name: 'kdot',
  description: 'A tool for managing apps on Kubernetes',
  usage: 'kdot [command] [args/apps] [options]',
  commands: {
    apply: {
      description: `
        Create or update resources in a cluster for a given configuration
      `,
      options: {
        prompt: {
          aliases: ['p'],
          description: `
            Whether to show a confirmation prompt before applying resources
          `,
          default: true
        },
        failFast: {
          aliases: ['f'],
          description: 'Whether to exit on the first failure encountered',
          default: false
        },
        wait: { aliases: ['w'] },
        timeout
      },
      run: kdot.apply
    },
    start: {
      description: `
        Facilitate local development by applying resources, streaming logs, and
        forwarding ports so that resources can be used locally
      `,
      options: {
        update: {
          aliases: ['u'],
          description: `
            Whether to update resources before streaming logs and forwarding
            ports
          `
        }
      },
      run: kdot.start
    },
    forward: {
      aliases: ['fwd'],
      description: `
        Forward local ports to apps in the cluster for a given configuration
      `,
      run: kdot.fwd
    },
    logs: {
      aliases: ['log'],
      description: `
        Stream logs from apps in the cluster for a given configuration to stdout
      `,
      run: kdot.log
    },
    stop: {
      description: `
        Stop forwarding ports and streaming logs when start was run in detached
        mode (in development)
      `,
      run: kdot.stop
    },
    show: {
      usage: 'kdot show [options] [apps]',
      description: `
        Show a list of resources in the cluster for a given configuration
      `,
      options: {
        verbose: {
          aliases: ['v'],
          description: 'Show more detailed resource information',
          default: false
        }
      },
      run: kdot.show
    },
    rollout: {
      aliases: ['roll'],
      description: 'Rollout app deployment changes',
      options: {
        prompt: {
          aliases: ['p'],
          description: `
            Whether to show a confirmation prompt before rolling out pods
          `,
          default: true
        },
        timeout
      },
      run: kdot.roll
    },
    scale: {
      description: "Scale the number of replicas for an app's Deployment",
      options: {
        replicas: {
          aliases: ['r'],
          description: 'The number of replicas to scale to'
          // FIXME:
          // type: Number
        },
        prompt: {
          aliases: ['p'],
          description: `
            Whether to show a confirmation prompt before scaling Deployments
          `,
          default: true
        },
        wait: {
          aliases: ['w'],
          description: 'Whether to wait for the replica pods to be ready',
          default: false
        },
        timeout
      },
      run: kdot.scale
    },
    delete: {
      aliases: ['del'],
      description: `
        Delete a namespace or resources for a given app in the cluster for a
        given configuration
      `,
      options: {
        prompt: {
          aliases: ['p'],
          description: `
            Whether to show a confirmation prompt before deleting resources
          `,
          default: true
        },
        wait: {
          aliases: ['w'],
          description: 'Whether to wait for the resources to be deleted',
          default: false
        }
      },
      run: kdot.del
    },
    build: {
      description: `
        Build container images in the cluster using Kaniko for apps in a given
        configuration
      `,
      options: {
        timeout,
        namespaceTag: {
          description: `
            Use the config namespace as the image tag for apps being built
          `,
          default: false
        }
      },
      run: kdot.build
    },
    copy: {
      description: `
        Copy files locally from a container belonging to an app running in the
        cluster for a given configuration
      `,
      aliases: ['cp'],
      run: kdot.cp
    },
    cleanup: {
      aliases: ['clean'],
      description: `
        Delete failed pods in a namespace for a given configuration'
      `,
      options: {
        prompt: {
          aliases: ['p'],
          description: `
            Whether to show a confirmation prompt before deleting resources
          `,
          default: true
        }
      },
      run: kdot.clean
    },
    exec: {
      usage: 'kdot exec [app] [options] [command]',
      description: `
        Execute a command within a contain belonging to an app running in the
        cluster for a given configuration
      `,
      aliases: ['e'],
      options: {
        pod: {
          aliases: ['p'],
          description: `
            Specify the pod containing the container the command will execute in
          `
        },
        container: { description: 'The container the command will execute in' }
      },
      run: kdot.exec
    },
    env: {
      usage: 'kdot env',
      run: kdot.env
    },
    set: {
      description: 'Set a configuration value for a given configuration',
      options: {
        prop: {
          description: ''
        }
      },
      run: kdot.set
    },
    get: {
      description: 'Log a configuration value for a given configuration',
      options: {
        prop: {
          description: ''
        }
      },
      run: kdot.get
    },
    namespace: {
      aliases: ['ns'],
      description: 'Create a namespace',
      options: {
        prefix: {
          description: `
            Prefix a string to the namespace generated from the git branch name
          `,
          default: ''
        },
        set: {
          description: 'Write the namespace to the specified config JSON file'
        }
      },
      run: kdot.ns
    }
  },
  options: {
    config: {
      aliases: ['c'],
      description: 'The name of the config to use',
      default: 'personal'
    },
    ext: {
      aliases: ['e'],
      description: 'Extend/override a config value using dot notation',
      default: {}
    }
  }
})

if (input?.helpText) {
  process.stdout.write('\n')

  const [command] = input.args || []
  if (command) {
    logger.error(`Command "${command}" not found`)
    process.stdout.write('\n')
  }

  logger.info(input.helpText)
  process.stdout.write('\n')

  if (command) process.exit(1)
}

if (input?.catch) {
  input.catch(err => {
    logger.fatal(err)
    process.exit(1)
  })
}
