import path from 'path'
import { promises as fs } from 'fs'

export default async function configureConfigMaps (cfg, owner) {
  // Determine which ConfigMaps to configure and which namespace to use
  // (top-level or app-level),
  const configMaps = owner?.configMaps || cfg.configMaps
  const namespace = owner?.namespace || cfg.namespace

  for (const [name, given] of Object.entries(configMaps)) {
    const metadata = { name, namespace }
    const data = given.data || {}
    const configMap = { app: owner, kind: 'ConfigMap', metadata, data }

    for (const file of given.files) {
      const isUrl = file instanceof URL
      const key = isUrl ? path.basename(file.toString()) : path.basename(file)
      const filePath = isUrl ? file : path.resolve(file)
      configMap.data[key] = await fs.readFile(filePath, 'utf8')
    }

    // If the ConfigMap is app-level and has a mountPath, add a volume to the
    // app so that the ConfigMap can be made availble to the app as files that
    // are mounted as a volume.
    if (owner && given.mountPath) {
      owner.volumes = owner.volumes || []
      owner.volumeMounts = owner.volumeMounts || []
      owner.volumes.push({ name, configMap: { name } })
      owner.volumeMounts.push({ name, mountPath: given.mountPath })
    }

    cfg.resources.push(configMap)
  }
}
