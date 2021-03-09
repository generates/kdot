import { merge } from '@generates/merger'

export default function kdotWebdriver (config = {}) {
  const {
    chrome,
    firefox,
    hub,
    image = { repo: 'elgalu/selenium', tag: '3.141.59-p54' }
  } = config
  const volumes = [{ name: 'dshm', emptyDir: { medium: 'Memory' } }]
  const volumeMounts = [{ name: 'dshm', mountPath: '/dev/shm' }]
  const shm = { volumeMounts, volumes }

  return {
    apps: {
      hub: merge(
        {
          image,
          ports: [{ port: 4444 }],
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
                dependsOn: ['hub'],
                image,
                ...shm,
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
                dependsOn: ['hub'],
                image,
                ...shm,
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
