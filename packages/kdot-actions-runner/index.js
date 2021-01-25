export default {
  image: { repo: 'generates/actions-runner', tag: 'v1.0.0' },
  env: {},
  secrets: [
    {
      name: 'actions-runner-token',
      values: [
        { TOKEN: 'ACTIONS_RUNNER_TOKEN' }
      ]
    }
  ]
}
