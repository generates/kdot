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
const inheritableHeader = '# Inheritable environment variables.'
const inheritedHeader = '# Inherited environment variables.'

export default async function env () {
  // Collect example.env files in the current directory and up to 2-levels deep.
  const collection = await Promise.all(paths.map(p => globa(p, globOptions)))
  const files = collection.flat()
  logger.debug('Found example.env files', files)

  let rootContent
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

      if (rootContent) {
        // TODO:
        // Extract environemnt variables from root .env that don't exist in
        // current .env.

        // Copy the root .env content into the new .env file as well.
        logger.log(`Appending root content to ${relativeDot}`)

        await fs.appendFile(dot, `\n${rootContent}`)
      }
    }

    // If the file is the root .env file, save it's content so it can be
    // appended to nested .env files.
    if (dir === process.cwd()) {
      rootContent = await fs.readFile(dot, 'utf8')
      const headerIndex = rootContent.indexOf(inheritableHeader)
      rootContent = rootContent.substring(headerIndex)
      const blankLineIndex = (rootContent.indexOf('\n\n') + 1) ||
        rootContent.length
      rootContent = rootContent.substring(0, blankLineIndex)
      rootContent = rootContent.replace(inheritableHeader, inheritedHeader)
      logger.debug('Root content', rootContent)
    }
  }
}
