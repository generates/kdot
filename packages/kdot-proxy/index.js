export default function kdotProxy ({ email, provider, secret } = {}) {
  // Add default secret configuration.
  if (secret) {
    if (!secret.name) secret.name = 'dns-credentials'
    if (!secret.ref) secret.ref = 'token'
  }

  const isCloudflare = provider === 'cloudflare'

  return {
    namespace: 'proxy',
    apps: {
      ...provider && {
        'external-dns': {
          image: {
            repo: 'k8s.gcr.io/external-dns/external-dns',
            tag: 'v0.7.3'
          },
          deployStrategy: 'Recreate',
          args: [
            '--source=ingress',
            `--provider=${provider}`,
            ...isCloudflare ? ['--cloudflare-proxied'] : []
          ],
          env: {
            ...isCloudflare && {
              CF_API_EMAIL: process.env.CF_API_EMAIL || email
            }
          },
          secrets: [{
            name: secret.name,
            values: [
              ...isCloudflare ? [{ CF_API_KEY: secret.value }] : []
            ]
          }],
          role: {
            cluster: true,
            rules: [
              {
                apiGroups: [''],
                resources: ['services', 'endpoints', 'pods'],
                verbs: ['get', 'list', 'watch']
              },
              {
                apiGroups: ['extensions', 'networking.k8s.io'],
                resources: ['ingresses'],
                verbs: ['get', 'list', 'watch']
              },
              {
                apiGroups: [''],
                resources: ['nodes'],
                verbs: ['list', 'watch']
              }
            ]
          }
        }
      }
    },
    externalResources: [
      'https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.43.0/deploy/static/provider/do/deploy.yaml',
      'https://github.com/jetstack/cert-manager/releases/download/v1.1.0/cert-manager.yaml'
    ],
    ...email && provider && secret
      ? {
          custom: [{
            apiVersion: 'cert-manager.io/v1',
            kind: 'ClusterIssuer',
            metadata: {
              name: 'kdot-cluster-issuer'
            },
            spec: {
              acme: {
                email,
                server: 'https://acme-v02.api.letsencrypt.org/directory',
                privateKeySecretRef: { name: 'kdot-proxy' },
                solvers: [
                  {
                    dns01: {
                      [provider]: {
                        [`${secret.ref}SecretRef`]: {
                          name: secret.name,
                          key: secret.key
                        }
                      }
                    }
                  }
                ]
              }
            }
          }],
          secrets: [{
            namespace: 'cert-manager',
            name: secret.name,
            values: [{ [secret.key]: secret.value }]
          }]
        }
      : {}
  }
}
