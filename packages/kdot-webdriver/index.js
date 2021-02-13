import { merge } from '@generates/merger'

export default function kdotWebdriver (config = {}) {
  const { chrome, firefox, grid } = config

  return {
    apps: {
      grid: merge(
        {
        },
        grid
      ),
      ...chrome
        ? {
            chrome: merge(
              {
              },
              chrome
            )
          }
        : {},
      ...firefox
        ? {
            firefox: merge(
              {
              },
              firefox
            )
          }
        : {}
    }
  }
}
