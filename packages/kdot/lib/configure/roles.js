export default function configureRoles (cfg, owner) {
  const roles = owner?.role ? [owner.role] : cfg.roles
  const namespace = owner?.namespace || cfg.namespace

  // Create an array for the resources if they don't exist.
  cfg.resources.roles = cfg.resources.roles || []
  cfg.resources.clusterRoles = cfg.resources.clusterRoles || []
  cfg.resources.serviceAccounts = cfg.resources.serviceAccounts || []
  cfg.resources.roleBindings = cfg.resources.roleBindings || []
  cfg.resources.clusterRoleBindings = cfg.resources.clusterRoleBindings || []

  for (const role of roles) {
    const name = role.name || owner.name

    if (role.rules) {
      cfg.resources[role.cluster ? 'clusterRoles' : 'roles'].push({
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

      const resource = role.cluster ? 'clusterRoleBindings' : 'roleBindings'
      cfg.resources[resource].push({
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
