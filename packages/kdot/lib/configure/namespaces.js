const labels = { managedBy: 'kdot' }

export default function configureNamespaces (cfg, owner) {
  const name = owner?.namespace || cfg.namespace
  const byExisting = r => r.kind === 'Namespace' && r.metadata.name === name
  const existing = cfg.resources.find(byExisting)
  if (!existing) {
    const namespace = { kind: 'Namespace', metadata: { name, labels } }
    cfg.resources.push(namespace)
  }
}
