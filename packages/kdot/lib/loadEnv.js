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
    //
    loaded.push(dirname)

    try {
      //
      const content = await fs.readFile(path.join(dirname, '.env'), 'utf8')

      //
      dotter.set(basename, dotenv.parse(content))
    } catch (err) {
      logger.debug(err)
    }
  }
}
