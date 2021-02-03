import path from 'path'
import { promises as fs } from 'fs'

export default async function configureConfigMaps (cfg, owner) {
  // Determine which ConfigMaps to configure and which namespace to use
  // (top-level or app-level),
  const configMaps = owner?.configMaps || cfg.configMaps
  const namespace = owner?.namespace || cfg.namespace

  for (const cm of configMaps) {
    const metadata = { name: cm.name, namespace }
    const configMap = { app: owner, kind: 'ConfigMap', metadata, data: {} }

    for (const file of cm.files) {
      const key = path.basename(file)
      configMap.data[key] = await fs.readFile(path.resolve(file), 'utf8')
    }

    // If the ConfigMap is app-level and has a mountPath, add a volume to the
    // app so that the ConfigMap can be made availble to the app as files that
    // are mounted as a volume.
    if (owner && cm.mountPath) {
      owner.volumes = owner.volumes || []
      owner.volumeMounts = owner.volumeMounts || []
      owner.volumes.push({ name: cm.name, configMap: { name: cm.name } })
      owner.volumeMounts.push({ name: cm.name, mountPath: cm.mountPath })
    }

    cfg.resources.push(configMap)
  }
}
