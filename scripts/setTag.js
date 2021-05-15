#!/usr/bin/env zx

//
const { version } = require(`../apps/${process.env.APP}/package.json`)

//
await $`echo "APP_TAG=v${version}" >> $GITHUB_ENV`
