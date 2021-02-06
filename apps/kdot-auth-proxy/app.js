import path from 'path'
import fs from 'fs'
import nrg from '@ianwalter/nrg'
import httpProxy from 'http-proxy'

const hostsFile = process.env.HOSTS_FILE || '../kdot-auth-proxy-conf/hosts.json'
const json = fs.readFileSync(path.resolve(hostsFile))
const hosts = JSON.parse(json)

const app = nrg.createApp({
  oauth: {
    github: {
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
  const { profile, ...rest } = ctx.session.grant?.response
  ctx.logger.info('Authentication', profile)
  ctx.logger.debug(rest)
  if (ctx.session.redirect) return ctx.redirect(ctx.session.redirect)
})

// Allow users to logout of their session.
app.get('/kdot-auth-proxy/logout', ...nrg.logout)

// Handle the authorization check and proxy.
app.use(ctx => {
  // Determine the target from the Host header.
  const target = hosts[ctx.request.hostname]

  if (target) {
    ctx.logger.debug('Proxy attempt', ctx.session.grant)

    const profile = ctx.session.grant?.response?.profile
    if (profile) {
      const isInOrg = target.org && profile.orgs.includes(target.org)
      if (isInOrg || target.users?.includes(profile.login)) {
        ctx.logger.debug('Proxying to:', target.url)

        // Tell koa not to respond since http-proxy will handle the response.
        ctx.respond = false

        // Proxy the request to the app's service.
        return proxy.web(ctx.req, ctx.res, { target: target.url })
      } else {
        // Return a 401 Unauthorized response.
        ctx.logger.error('Unauthorized', { target, profile })
        ctx.status = 401
      }
    } else {
      // Determine where the user should be redirected to after authentication.
      let url = new URL(ctx.request.href)
      if (target.proxyUrl) url = new URL(url.pathname, target.proxyUrl)
      ctx.logger.debug('Redirecting to:', url.href)

      // Redirect the user to authenticate with GitHub.
      ctx.session.redirect = url.href
      ctx.redirect('/connect/github')
    }
  } else {
    // Log an error when the host isn't found since this is likely a
    // configuration issue.
    ctx.logger.error('Host not found', ctx.request.hostname)
  }
})

export default app
