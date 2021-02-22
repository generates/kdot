import path from 'path'
import { promises as fs } from 'fs'
import { createLogger } from '@generates/logger'
import { merge } from '@generates/merger'

const logger = createLogger({ namespace: 'kdot.set', level: 'info' })

export default async function set (input) {
  // Determine the config file to modify/create.
  const configPath = path.parse(input.config)
  const configFile = path.resolve(configPath.dir, `k.${configPath.base}.json`)

  // Read the existing JSON config if the config file exists.
  let json = {}
  try {
    const content = await fs.readFile(configFile, 'utf8')
    json = JSON.parse(content)
  } catch (err) {
    logger.debug('Config file error', err)
  }

  // Merge the existing config with the new values passed in through the CLI.
  merge(json, input.ext)

  // Write the updated JSON back to the filesystem.
  await fs.writeFile(configFile, JSON.stringify(json, undefined, 2))

  logger.success(`Updated ${configFile}:`, json)
}
