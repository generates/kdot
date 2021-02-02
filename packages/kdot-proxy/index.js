export default function kdotProxy ({ email, provider, secret } = {}) {
  // Add default secret configuration.
  if (secret) {
    if (!secret.name) secret.name = 'dns-credentials'
    if (!secret.ref) secret.ref = 'token'
  }

  return {
    namespace: 'proxy',
    apps: {
      // 'external-dns': {
      //   image: { repo: '' }
      // }
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
                          key: Object.keys(secret.values[0])[0]
                        }
                      }
                    }
                  }
                ]
              }
            }
          }],
          secrets: [{ namespace: 'cert-manager', ...secret }]
        }
      : {}
  }
}
