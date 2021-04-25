const labels = { managedBy: 'kdot' }

export default async function configureServices (cfg, app) {
  if (app.ports) {
    const { name, namespace } = app
    const hostPorts = Object.values(app.ports).filter(p => p.hosts)
    if (hostPorts.length) {
      const clusterIssuer = cfg.clusterIssuer || 'kdot-cluster-issuer'
      const annotations = { 'cert-manager.io/cluster-issuer': clusterIssuer }
      const metadata = { name, namespace, labels, annotations }
      const apiVersion = 'networking.k8s.io/v1'
      const spec = { rules: [], tls: [] }
      const ingress = { app, apiVersion, kind: 'Ingress', metadata, spec }

      for (const p of hostPorts) {
        const pathType = p.pathType || 'Prefix'
        const backend = { service: { name, port: { number: p.port } } }
        const path = { path: p.path || '/', pathType, backend }
        for (const host of p.hosts) {
          ingress.spec.rules.push({ host, http: { paths: [path] } })
        }

        // Configure the TLS settings for cert-manager.
        const secretName = `${name}${p.name ? `-${p.name}` : ''}-cert`
        ingress.spec.tls.push({ hosts: p.hosts, secretName })
      }

      cfg.resources.push(ingress)
    }
  }
}
