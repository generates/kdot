export default function configureRoles (cfg, owner) {
  const roles = owner?.role ? [owner.role] : cfg.roles
  const namespace = owner?.namespace || cfg.namespace

  for (const role of roles) {
    const name = role.name || owner.name
    const kind = role.cluster ? 'ClusterRole' : 'Role'

    if (role.rules) {
      cfg.resources.push({
        apiVersion: 'rbac.authorization.k8s.io/v1',
        app: owner,
        kind,
        metadata: { ...role.cluster ? {} : { namespace }, name },
        rules: role.rules
      })
    }

    if (owner) {
      const metadata = { namespace, name }
      cfg.resources.push({ app: owner, kind: 'ServiceAccount', metadata })

      cfg.resources.push({
        apiVersion: 'rbac.authorization.k8s.io/v1',
        app: owner,
        kind: role.cluster ? 'ClusterRoleBinding' : 'RoleBinding',
        metadata: { ...role.cluster ? {} : { namespace }, name },
        roleRef: { apiGroup: 'rbac.authorization.k8s.io', kind, name },
        subjects: [{ kind: 'ServiceAccount', namespace, name }]
      })
    }
  }
}
