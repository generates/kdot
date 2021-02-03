export default function configureRoles (cfg, owner) {
  const roles = owner?.role ? [owner.role] : cfg.roles
  const namespace = owner?.namespace || cfg.namespace

  for (const role of roles) {
    const name = role.name || owner.name
    const kind = role.cluster ? 'ClusterRole' : 'Role'

    if (role.rules) {
      const metadata = { ...role.cluster ? {} : { namespace }, name }
      cfg.resources.push({ app: owner, kind, metadata, rules: role.rules })
    }

    if (owner) {
      const metadata = { namespace, name }
      cfg.resources.push({ app: owner, kind: 'ServiceAccount', metadata })

      cfg.resources.push({
        app: owner,
        kind: role.cluster ? 'ClusterRoleBinding' : 'RoleBinding',
        metadata: { ...role.cluster ? {} : { namespace }, name },
        roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind, name },
        subjects: [{ kind: 'ServiceAccount', namespace, name }]
      })
    }
  }
}
