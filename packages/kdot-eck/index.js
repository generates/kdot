export default function kdotEck (config = {}) {
  const { namespace = 'elastic', name = 'eck' } = config
  return {
    namespace,
    externalResources: [
      'https://download.elastic.co/downloads/eck/1.5.0/all-in-one.yaml'
    ],
    resources: [
      // Elasticsearch
      {
        apiVersion: 'elasticsearch.k8s.elastic.co/v1',
        kind: 'Elasticsearch',
        metadata: { namespace, name },
        spec: {
          version: '7.12.1',
          nodeSets: [
            {
              name: 'default',
              count: 1,
              config: { 'node.store.allow_mmap': false }
            }
          ]
        }
      },
      // Kibana
      {
        apiVersion: 'kibana.k8s.elastic.co/v1',
        kind: 'Kibana',
        metadata: { namespace, name },
        spec: {
          version: '7.12.1',
          count: 1,
          elasticsearchRef: { name }
        }
      },
      // Fluentd
      {
        apiVersion: 'apps/v1',
        kind: 'DaemonSet',
        metadata: {
          name: 'fluentd',
          namespace: 'kube-system',
          labels: {
            'k8s-app': 'fluentd-logging',
            version: 'v1'
          }
        },
        spec: {
          selector: {
            matchLabels: {
              'k8s-app': 'fluentd-logging',
              version: 'v1'
            }
          },
          template: {
            metadata: {
              labels: {
                'k8s-app': 'fluentd-logging',
                version: 'v1'
              }
            },
            spec: {
              tolerations: [
                {
                  key: 'node-role.kubernetes.io/MediaStream',
                  effect: 'NoSchedule'
                }
              ],
              containers: [
                {
                  name: 'fluentd',
                  image: 'fluent/fluentd-kubernetes-daemonset:v1-debian-elasticsearch',
                  env: [
                    {
                      name: 'FLUENT_ELASTICSEARCH_HOST',
                      value: 'elasticsearch-logging'
                    },
                    {
                      name: 'FLUENT_ELASTICSEARCH_PORT',
                      value: '9200'
                    },
                    {
                      name: 'FLUENT_ELASTICSEARCH_SCHEME',
                      value: 'http'
                    },
                    {
                      name: 'FLUENT_ELASTICSEARCH_SSL_VERIFY',
                      value: 'false'
                    },
                    {
                      name: 'FLUENT_ELASTICSEARCH_USER',
                      value: 'elastic'
                    },
                    {
                      name: 'FLUENT_ELASTICSEARCH_PASSWORD',
                      value: 'changeme'
                    }
                  ],
                  resources: {
                    limits: { memory: '200Mi' },
                    requests: { cpu: '100m', memory: '200Mi' }
                  },
                  volumeMounts: [
                    { name: 'varlog', mountPath: '/var/log' },
                    {
                      name: 'varlibdockercontainers',
                      mountPath: '/var/lib/docker/containers',
                      readOnly: true
                    }
                  ]
                }
              ],
              terminationGracePeriodSeconds: 30,
              volumes: [
                {
                  name: 'varlog',
                  hostPath: { path: '/var/log' }
                },
                {
                  name: 'varlibdockercontainers',
                  hostPath: { path: '/var/lib/docker/containers' }
                }
              ]
            }
          }
        }
      }
    ]
  }
}
