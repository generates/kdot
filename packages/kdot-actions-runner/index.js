export default {
  namespace: 'ci',
  apps: {
    'actions-runner': {
      image: { repo: 'generates/actions-runner', tag: 'v0.0.1' },
      env: {
        NAME: {
          fieldRef: { fieldPath: 'metadata.name' }
        }
      },
      secrets: [
        {
          name: 'actions-runner-token',
          values: [
            { TOKEN: 'ACTIONS_RUNNER_TOKEN' }
          ]
        }
      ]
    }
  }
}
