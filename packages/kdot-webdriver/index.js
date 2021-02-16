import { merge } from '@generates/merger'

export default function kdotWebdriver (config = {}) {
  const {
    chrome,
    firefox,
    hub,
    image = { repo: 'elgalu/selenium', tag: '3.141.59-p54' }
  } = config

  return {
    apps: {
      hub: merge(
        {
          image,
          ports: [{ port: 4444 }],
          // volumes:
          //   - /dev/shm:/dev/shm
          env: {
            SELENIUM_HUB_HOST: 'hub',
            SELENIUM_HUB_PORT: '4444',
            GRID: 'true',
            CHROME: 'false',
            FIREFOX: 'false'
          }
        },
        hub
      ),
      ...chrome
        ? {
            chrome: merge(
              {
                image,
                dependsOn: ['hub'],
                // volumes:
                //   - /dev/shm:/dev/shm
                env: {
                  SELENIUM_HUB_HOST: 'hub',
                  SELENIUM_HUB_PORT: '4444',
                  GRID: 'false',
                  CHROME: 'true',
                  FIREFOX: 'false'
                }
              },
              chrome
            )
          }
        : {},
      ...firefox
        ? {
            firefox: merge(
              {
                image,
                dependsOn: ['hub'],
                // volumes:
                //   - /dev/shm:/dev/shm
                env: {
                  SELENIUM_HUB_HOST: 'hub',
                  SELENIUM_HUB_PORT: '4444',
                  GRID: 'false',
                  CHROME: 'false',
                  FIREFOX: 'true'
                }
              },
              firefox
            )
          }
        : {}
    }
  }
}
