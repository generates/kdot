const labels = { managedBy: 'kdot' }

export default function configureNamespaces (cfg, owner) {
  const name = owner?.namespace || cfg.namespace
  const notNamespace = r => r.kind === 'Namespace' && r.metadata.name !== name
  if (cfg.resources.every(notNamespace)) {
    const namespace = { kind: 'Namespace', metadata: { name, labels } }
    cfg.resources.push(namespace)
  }
}
