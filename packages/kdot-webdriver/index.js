import { merge } from '@generates/merger'
import { oneLine } from 'common-tags'

export default function kdotWebdriver (config = {}) {
  const {
    preset = 'headless',
    tag = '4.0.0-beta-3-prerelease-20210329',
    hub,
    chrome,
    firefox
  } = config
  const volumes = [{ name: 'dshm', emptyDir: { medium: 'Memory' } }]
  const volumeMounts = [{ name: 'dshm', mountPath: '/dev/shm' }]
  const shm = { volumeMounts, volumes }

  return {
    apps: {
      hub: merge(
        {
          image: { repo: 'selenium/hub', tag },
          ports: {
            pub: { port: 4442, localPort: false },
            sub: { port: 4443, localPort: false },
            hub: { port: 4444 }
          },
          livenessProbe: {
            httpGet: { path: '/', port: 4444 },
            initialDelaySeconds: 30,
            periodSeconds: 5,
            timeoutSeconds: 1
          },
          readinessProbe: {
            httpGet: { path: '/', port: 4444 },
            initialDelaySeconds: 15,
            timeoutSeconds: 1
          }
        },
        hub
      ),
      ...chrome
        ? {
            chrome: merge(
              {
                dependsOn: ['hub'],
                image: { repo: 'selenium/node-chrome', tag },
                ...shm,
                env: {
                  SE_EVENT_BUS_HOST: 'hub',
                  SE_EVENT_BUS_PUBLISH_PORT: '4442',
                  SE_EVENT_BUS_SUBSCRIBE_PORT: '4443',
                  JAVA_OPTS: oneLine`
                    -Djava.net.preferIPv4Stack=true
                    -Dwebdriver.chrome.whitelistedIps=
                  `
                }
              },
              preset === 'debug' && {
                env: {
                  VNC_NO_PASSWORD: '1'
                },
                ports: {
                  app: { port: 5900 }
                }
              },
              preset === 'headless' && {
                env: {
                  START_XVFB: 'false'
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
                image: { repo: 'selenium/node-firefox', tag },
                ...shm,
                env: {
                  SE_EVENT_BUS_HOST: 'hub',
                  SE_EVENT_BUS_PUBLISH_PORT: '4442',
                  SE_EVENT_BUS_SUBSCRIBE_PORT: '4443',
                  VNC_NO_PASSWORD: '1'
                }
              },
              preset === 'debug' && {
                env: {
                  VNC_NO_PASSWORD: '1'
                },
                ports: {
                  app: { port: 5900, localPort: 5901 }
                }
              },
              preset === 'headless' && {
                env: {
                  START_XVFB: 'false'
                }
              },
              firefox
            )
          }
        : {}
    }
  }
}
