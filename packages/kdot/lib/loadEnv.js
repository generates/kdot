import { promises as fs } from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import dotter from '@generates/dotter'
import { createLogger } from '@generates/logger'

const logger = createLogger({ namespace: 'kdot.load.env', level: 'info' })

export const loaded = []
export const env = {}

export async function loadEnv (dirname, basename) {
  if (!loaded.includes(dirname)) {
    try {
      // Read the .env file for the directory.
      const content = await fs.readFile(path.join(dirname, '.env'), 'utf8')

      // Load the .env file data into the env object using the basename as a
      // namespace path.
      dotter.set(env, basename, dotenv.parse(content))

      // Keep track of the directories that have had their .env files loaded
      // already.
      loaded.push(dirname)
    } catch (err) {
      logger.debug(err)
    }
  }
}
