const certManager = 'https://github.com/jetstack/cert-manager/releases/download/v1.1.0/cert-manager.yaml'

export default function kdotProxy (config) {
  const {
    email = process.env.LETSENCRYPT_EMAIL,
    dnsProvider,
    lbProvider,
    secret,
    useCloudflareProxy
  } = config || {}

  // Add default secret configuration.
  if (secret) {
    if (!secret.name) secret.name = 'dns-credentials'
    if (!secret.ref) secret.ref = 'token'
  }

  const isCloudflareDns = dnsProvider === 'cloudflare'

  let ingressNginx = 'https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.43.0/deploy/static/provider/do/deploy.yaml'
  if (lbProvider === 'google') {
    ingressNginx = 'https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v0.44.0/deploy/static/provider/cloud/deploy.yaml'
  }

  return {
    namespace: 'proxy',
    apps: {
      ...dnsProvider && secret && {
        'external-dns': {
          image: {
            repo: 'k8s.gcr.io/external-dns/external-dns',
            tag: 'v0.7.3'
          },
          deployStrategy: 'Recreate',
          args: [
            '--source=ingress',
            `--provider=${dnsProvider}`,
            ...useCloudflareProxy ? ['--cloudflare-proxied'] : []
          ],
          secrets: [{
            name: secret.name,
            values: [
              ...isCloudflareDns ? [{ CF_API_TOKEN: secret.value }] : []
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
      ...lbProvider ? [ingressNginx] : [],
      ...dnsProvider ? [certManager] : []
    ],
    ...email && dnsProvider && secret
      ? {
          resources: [{
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
                      [dnsProvider]: {
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
