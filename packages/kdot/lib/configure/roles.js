export default function configureRoles (cfg, owner) {
  const roles = owner?.roles || cfg.roles
  const namespace = owner?.namespace || cfg.namespace

  // Create an array for the resources if they don't exist.
  cfg.resources.roles = cfg.resources.roles || []
  cfg.resources.secviceAccounts = cfg.resources.secviceAccounts || []
  cfg.resources.roleBindings = cfg.resources.roleBindings || []

  for (const role of roles) {
    const name = role.name || owner.name

    if (role.rules) {
      cfg.resources.roles.push({
        app: owner,
        kind: role.cluster ? 'ClusterRole' : 'Role',
        metadata: { ...role.cluster ? {} : { namespace }, name },
        rules: role.rules
      })
    }

    if (owner) {
      cfg.resources.serviceAccounts.push({
        app: owner,
        kind: 'ServiceAccount',
        metadata: { namespace, name }
      })

      cfg.resources.roleBindings.push({
        app: owner,
        kind: role.cluster ? 'ClusterRoleBinding' : 'RoleBinding',
        metadata: { ...role.cluster ? {} : { namespace }, name },
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: role.cluster ? 'ClusterRole' : 'Role',
          name
        },
        subjects: [{ kind: 'ServiceAccount', namespace, name }]
      })
    }
  }
}
