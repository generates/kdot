import gitinfo from 'gitinfo'
import parseGitUrl from 'git-url-parse'
import { createLogger } from '@generates/logger'

const createGitInfo = gitinfo.default
const logger = createLogger({ level: 'info', namespace: 'kdot.build' })

export default function getBuildContext (context = {}) {
  let {
    repo,
    ref = process.env.GITHUB_HEAD_REF,
    sha = process.env.GITHUB_SHA
  } = context

  if (!repo || !ref || !sha) {
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

    if (!sha) {
      try {
        sha = gitInfo.getHeadSha()
      } catch (err) {
        logger.debug(err)
        logger.warning("Can't determine build sha")
      }
    }
  }

  return `${repo}${ref ? `#refs/heads/${ref}` : ''}${sha ? `#${sha}` : ''}`
}
