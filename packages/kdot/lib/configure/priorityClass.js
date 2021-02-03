export default function configurePriorityClass (cfg, app) {
  const name = `priority-${app.priority}`
  const byExisting = r => r.kind === 'PriorityClass' && r.metadata.name === name
  const existing = cfg.resources.find(byExisting)
  const appName = `${app.namespace}.${app.name}`
  if (existing) {
    existing.description += `, ${appName}`
  } else {
    cfg.resources.push({
      kind: 'PriorityClass',
      metadata: { name, labels: { managedBy: 'kdot' } },
      value: app.priority,
      description: `This priority class was created for ${appName}`
    })
  }
}
