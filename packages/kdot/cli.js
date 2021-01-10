#!/usr/bin/env node

import path from 'path'
import cli from '@generates/cli'
import * as kdot from './index.js'
import configure from './lib/configure/index.js'

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
      default: 'default'
    },
    ext: {
      alias: 'e',
      description: 'Extend/override a config value using dot notation'
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
    }
  }
})

//
input.args = args

// Consolidate the configuration into a single set of values.
const cfg = await configure(input)

if (command === 'set') {
  kdot.set(cfg)
} else if (command === 'get') {
  kdot.get(cfg)
} else if (command === 'build') {
  kdot.build(cfg)
} else if (command === 'apply') {
  kdot.apply(cfg)
} else if (command === 'fwd') {
  kdot.fwd(cfg)
} else if (command === 'log') {
  kdot.log(cfg)
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
}
