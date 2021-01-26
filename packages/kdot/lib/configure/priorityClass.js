export default function configurePriorityClass (cfg, app) {
  cfg.resources.priorityClasses = cfg.resources.priorityClasses || []

  const name = `priority-${app.priority}`
  const byName = p => p.metadata.name === name
  const appName = `${app.namespace}.${app.name}`
  const existing = cfg.resources.priorityClasses.find(byName)
  if (existing) {
    existing.description += `, ${appName}`
  } else {
    cfg.resources.priorityClasses.push({
      kind: 'PriorityClass',
      metadata: { name, labels: { managedBy: 'kdot' } },
      value: app.priority,
      description: `This priority class was created for ${appName}`
    })
  }
}
