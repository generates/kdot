import { promises as fs } from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import dotter from '@generates/dotter'
import { createLogger } from '@generates/logger'
import { merge } from '@generates/merger'

const logger = createLogger({ namespace: 'kdot.load.env', level: 'info' })

export const loaded = []
export const env = {}

export async function loadEnv (dirname, basename) {
  const name = basename.replaceAll('.', '')
  if (loaded.includes(dirname)) {
    logger.debug('Skipping already loaded .env for directory:', dirname)
  } else {
    logger.debug('Loading .env for directory:', dirname)
    try {
      // Read the .env file for the directory.
      const content = await fs.readFile(path.join(dirname, '.env'), 'utf8')

      if (dirname && dirname !== '.') {
        // If a dirname is passed treat the config as a nested config and load
        // the .env file data into the env object using the basename as a
        // namespace path.
        dotter.set(env, name, dotenv.parse(content))
        logger.debug(`env.${name}`, env[name])
      } else {
        // If no dirname is passed treat the config as the root config and load
        // the .env file data into the root of the env object.
        merge(env, dotenv.parse(content))
        logger.debug('env', env)
      }

      // Keep track of the directories that have had their .env files loaded
      // already.
      loaded.push(dirname)
    } catch (err) {
      logger.debug(err)
    }
  }
}
