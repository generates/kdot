import path from 'path'
import util from 'util'
import { existsSync, promises as fs } from 'fs'
import { createLogger } from '@generates/logger'
import glob from 'glob'

const logger = createLogger({ level: 'info', namespace: 'kdot.env' })
const globa = util.promisify(glob)
const ignore = 'node_modules/**'
const globOptions = { nosort: true, nodir: true, ignore, absolute: true }
const paths = ['example.env', '*/example.env', '*/*/example.env']

export default async function env () {
  // Collect example.env files in the current directory and up to 2-levels deep.
  const collection = await Promise.all(paths.map(p => globa(p, globOptions)))
  const files = collection.flat()
  logger.debug('Found example.env files', files)

  for (const file of files) {
    // Check for the existence of a .env file in the same directory.
    const dir = path.dirname(file)
    const dot = path.join(dir, '.env')
    const relativeFile = path.relative(process.cwd(), file)
    const relativeDot = path.relative(process.cwd(), dot)
    if (existsSync(dot)) {
      logger.log(`Ignoring ${relativeDot} since it already exists`)
    } else {
      // If no .env exists, create it from the example.env
      logger.success(`Copying ${relativeFile} to ${relativeDot}`)
      await fs.copyFile(file, dot)
    }
  }
}
