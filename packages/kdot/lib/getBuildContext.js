import { createLogger } from '@generates/logger'
import execa from 'execa'
import parseGitUrl from 'git-url-parse'

const logger = createLogger({ level: 'info', namespace: 'kdot.build' })

export default async function getBuildContext (context = {}) {
  let { repo, branch = process.env.GITHUB_HEAD_REF } = context

  if (!repo || !branch) {
    if (!repo) {
      if (process.env.GITHUB_REPOSITORY) {
        repo = `git://github.com/${process.env.GITHUB_REPOSITORY}.git`
      } else {
        try {
          const { stdout } = await execa('git', ['remote', 'get-url', 'origin'])
          const gitUrl = parseGitUrl(stdout)
          repo = `git://${gitUrl.source}${gitUrl.pathname}`
        } catch (err) {
          logger.debug(err)
          logger.fatal("Can't determine build repository URL")
          process.exit(1)
        }
      }
    }

    if (!branch) {
      try {
        const { stdout } = await execa('git', ['branch', '--show-current'])
        branch = stdout
      } catch (err) {
        logger.debug(err)
        logger.warning("Can't determine build branch")
      }
    }
  }

  return `${repo}${branch ? `#refs/heads/${branch}` : ''}`
}
