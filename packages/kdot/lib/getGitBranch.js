import { createLogger } from '@generates/logger'
import execa from 'execa'

const logger = createLogger({ level: 'info', namespace: 'kdot.git' })

export default async function getGitBranch (context = {}) {
  let { branch = process.env.GITHUB_HEAD_REF } = context

  if (!branch) {
    try {
      const { stdout } = await execa('git', ['branch', '--show-current'])
      branch = stdout
    } catch (err) {
      logger.debug(err)
      logger.warn("Can't determine build branch")
    }
  }

  return branch
}
