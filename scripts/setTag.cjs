const { version } = require(`../apps/${process.env.APP}/package.json`)
process.env.APP_TAG = `v${version}`
