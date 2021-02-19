#!/usr/bin/env node

import { createLogger } from '@generates/logger'
import cli from '@generates/cli'
import * as kdot from './index.js'
import configure from './lib/configure/index.js'

const logger = createLogger({ level: 'info', namespace: 'kdot.cli' })

const { _: [command, ...args], packageJson, ...input } = cli({
  name: 'kdot',
  description: 'A tool for managing apps on Kubernetes',
  usage: 'kdot [command] [apps] [options]',
  // FIXME: get this to work.
  commands: {
    up: {},
    fwd: {
      aliases: ['forward']
    },
    log: {
      aliases: ['logs']
    },
    del: {
      aliases: ['delete']
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
    },
    prompt: {
      alias: 'p',
      description: 'Whether to show a prompt before applying resources',
      default: true
    },
    failFast: {
      alias: 'f',
      description: 'Specifies whether to exit on the first failure',
      default: false
    },
    prop: {
      description: ''
    },
    update: {
      alias: 'u',
      description: 'Update resources before executing subsequent commands'
    },
    wait: {
      alias: 'w'
    },
    timeout: {
      alias: 't'
    }
  }
})

//
input.args = args

try {
  if (input.help) {
    process.stdout.write('\n')
    logger.info(input.helpText)
  } else if (command === 'set') {
    kdot.set(input)
  } else {
    // Consolidate the configuration into a single set of values.
    const cfg = await configure(input)

    if (command === 'get') {
      kdot.get(cfg)
    } else if (command === 'build') {
      await kdot.build(cfg)
    } else if (command === 'apply') {
      kdot.apply(cfg)
    } else if (command === 'fwd') {
      kdot.fwd(cfg)
    } else if (command === 'log') {
      kdot.log(cfg)
    } else if (command === 'show') {
      kdot.show(cfg)
    } else if (command === 'start') {
      kdot.start(cfg)
    } else if (command === 'stop') {
      kdot.stop(cfg)
    } else if (command === 'up') {
      kdot.up(cfg)
    } else if (command === 'down') {
      kdot.down(cfg)
    } else if (command === 'del') {
      kdot.del(cfg)
    } else if (command === 'cp') {
      kdot.cp(cfg)
    } else if (command === 'cleanup') {
      kdot.cleanup(cfg)
    } else {
      process.stdout.write('\n')
      logger.info(input.helpText)
    }
  }
} catch (err) {
  logger.fatal(err)
  process.exit(1)
}
