const labels = { managedBy: 'kdot' }

export default function configureNamespaces (cfg, owner) {
  cfg.resources.namespaces = cfg.resources.namespaces || []

  const name = owner?.namespace || cfg.namespace
  if (cfg.resources.namespace.every(n => n.metadata.name !== name)) {
    const namespace = { kind: 'Namespace', metadata: { name, labels } }
    cfg.resources.namespaces.push(namespace)
  }
}
