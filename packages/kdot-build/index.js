let context = process.env.KDOT_BUILD_CONTEXT
if (!context && process.env.GITHUB_REPOSITORY) {
  const sha = process.env.GITHUB_SHA
  context = `git://github.com/${process.env.GITHUB_REPOSITORY}.git#${sha}`
}

export default {
  image: { repo: 'gcr.io/kaniko-project/executor', tag: 'latest' },
  args: [
    `--dockerfile=${process.env.KDOT_BUILD_DOCKERFILE || './Dockerfile'}`,
    `--context=${context}`,
    `--destination=${process.env.KDOT_BUILD_IMAGE}`,
    `--digest-file=${process.env.KDOT_BUILD_DIGEST || '/dev/termination-log'}`,
    '--skip-unused-stages'
  ],
  secrets: [
    {
      name: 'kdot-build',
      values: [
        { GIT_TOKEN: 'KDOT_BUILD_GIT_TOKEN' }
      ]
    }
  ]
}
