import gitinfo from 'gitinfo'
import parseGitUrl from 'git-url-parse'
import { createLogger } from '@generates/logger'

const createGitInfo = gitinfo.default
const logger = createLogger({ level: 'info', namespace: 'kdot.build' })

export default function getBuildContext (context = {}) {
  let { repo, ref = process.env.GITHUB_HEAD_REF } = context

  if (!repo || !ref) {
    const gitInfo = createGitInfo({ gitPath: process.cwd() })

    if (!repo) {
      if (process.env.GITHUB_REPOSITORY) {
        repo = `git://github.com/${process.env.GITHUB_REPOSITORY}.git`
      } else {
        try {
          const gitUrl = parseGitUrl(gitInfo.getRemoteUrl())
          repo = `git://${gitUrl.source}${gitUrl.pathname}`
        } catch (err) {
          logger.debug(err)
          logger.fatal("Can't determine build repository URL")
          process.exit(1)
        }
      }
    }

    if (!ref) {
      try {
        ref = gitInfo.getBranchName()
      } catch (err) {
        logger.debug(err)
        logger.warning("Can't determine build ref")
      }
    }
  }

  return `${repo}${ref ? `#refs/heads/${ref}` : ''}`
}
