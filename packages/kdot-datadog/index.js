const metricsAndLogs = ['metrics', 'logs']

const equalArray = (a, b) => (
  a.every(i => b.includes(i)) && b.every(i => a.includes(i))
)

export default function kdotDatadog (config = {}) {
  const { features = metricsAndLogs } = config
  const externalResources = [
    'https://raw.githubusercontent.com/DataDog/datadog-agent/master/Dockerfiles/manifests/rbac/clusterrole.yaml',
    'https://raw.githubusercontent.com/DataDog/datadog-agent/master/Dockerfiles/manifests/rbac/serviceaccount.yaml',
    'https://raw.githubusercontent.com/DataDog/datadog-agent/master/Dockerfiles/manifests/rbac/clusterrolebinding.yaml'
  ]

  if (equalArray(features, metricsAndLogs)) {
    externalResources.push('https://docs.datadoghq.com/resources/yaml/datadog-agent-logs.yaml')
  }

  return {
    namespace: 'default',
    // TODO: When plugins implemented:
    // namespace: 'datadog',
    externalResources,
    secrets: {
      'datadog-agent': {
        env: [{ 'api-key': 'DATADOG_API_KEY' }]
      }
    }
  }
}
