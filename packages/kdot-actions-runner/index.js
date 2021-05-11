export default {
  namespace: 'ci',
  apps: {
    'actions-runner': {
      image: { repo: 'generates/actions-runner', tag: 'v2.277.1' },
      env: {
        NAME: {
          fieldRef: { fieldPath: 'metadata.name' }
        }
      },
      secrets: {
        'actions-runner-token': {
          values: [
            { TOKEN: 'ACTIONS_RUNNER_TOKEN' }
          ]
        }
      }
    }
  }
}
