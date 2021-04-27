import fs from 'fs'
import nrg from '@ianwalter/nrg'
import httpProxy from 'http-proxy'

const json = fs.readFileSync('/opt/kdot-auth-proxy-conf/hosts.json')
const hosts = JSON.parse(json)

const app = nrg.createApp({
  sessions: {
    key: 'kdotAuthProxy'
  },
  oauth: {
    github: {
      dynamic: ['redirect_uri'],
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      callback: '/kdot-auth-proxy/callback',
      response: ['tokens', 'profile'],
      scope: ['read:org']
    }
  }
})

app.logger.info('Hosts', hosts)

// Tell koa to use the X-Forwarded-Host header.
app.proxy = true

// Initialize the proxy.
const proxy = httpProxy.createProxyServer()

// Warn the user if OAUTH is not enabled.
if (!app.context.cfg.oauth.enabled) {
  app.logger.warn('OAUTH is not enabled since no config was found')
}

// Redirect the user to the previously request URL after authentication.
app.get(app.context.cfg.oauth.github.callback, ctx => {
  const logger = ctx.logger.ns('kdot.auth')
  const { profile, ...rest } = ctx.session.grant?.response
  logger.info('Authentication', profile)
  logger.debug(rest)
  if (ctx.session.redirect) {
    logger.info('Redirecting to:', ctx.session.redirect)
    ctx.redirect(ctx.session.redirect)
  }
})

// Allow users to logout of their session.
app.get('/kdot-auth-proxy/logout', ...nrg.logout)

// Handle the authorization check and proxy.
app.use(ctx => {
  const logger = ctx.logger.ns('kdot.auth')

  // Determine the target from the Host header.
  const target = hosts[ctx.request.hostname]

  if (target) {
    logger.debug('Proxy attempt', ctx.session.grant)

    const profile = ctx.session.grant?.response?.profile
    if (profile) {
      const isInOrg = target.org && profile.orgs.includes(target.org)
      if (isInOrg || target.users?.includes(profile.login)) {
        logger.debug('Proxying to:', target.url)

        // Tell koa not to respond since http-proxy will handle the response.
        ctx.respond = false

        // Proxy the request to the app's service.
        return proxy.web(ctx.req, ctx.res, { target: target.url })
      } else {
        // Return a 401 Unauthorized response.
        logger.error('Unauthorized', { target, profile })
        ctx.status = 401
      }
    } else {
      // Determine where the user should be redirected to after authentication.
      let url = new URL(ctx.request.href)
      if (target.proxyUrl) url = new URL(url.pathname, target.proxyUrl)
      logger.debug('Redirecting to:', url.href)

      // Redirect the user to authenticate with GitHub.
      ctx.session.redirect = url.href
      const origin = process.env.REDIRECT_ORIGIN || ctx.origin
      const redirectUri = `${origin}/connect/github/callback`
      ctx.redirect(`/connect/github?redirect_uri=${redirectUri}`)
    }
  } else {
    // Log an error when the host isn't found since this is likely a
    // configuration issue.
    const info = { hostname: ctx.request.hostname, headers: ctx.headers }
    logger.error('Host not found', info)
  }
})

export default app
