export default function configurePriorityClass (cfg, app) {
  const name = `priority-${app.priority}`
  const appName = `${app.namespace}.${app.name}`
  const existing = cfg.priorityClasses.find(p => p.metadata.name === name)
  if (existing) {
    existing.description += `, ${appName}`
  } else {
    cfg.priorityClasses.push({
      kind: 'PriorityClass',
      metadata: { name, labels: { managedBy: 'kdot' } },
      value: app.priority,
      description: `This priority class was created for ${appName}`
    })
  }
}
