import fs from 'fs'
import nrg from '@ianwalter/nrg'
import httpProxy from 'http-proxy'
import { nanoid } from 'nanoid'

const app = nrg.createApp({
  sessions: {
    key: 'kdotAuthProxy',
    csrf: false
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

let hosts = {}
try {
  const json = fs.readFileSync('/opt/kdot-auth-proxy-conf/hosts.json')
  hosts = JSON.parse(json)
  app.logger.info('Hosts', hosts)
} catch (err) {
  app.logger.warn(err)
}

// Tell koa to use the X-Forwarded-Host header.
app.proxy = true

// Initialize the proxy.
const proxy = httpProxy.createProxyServer()

// Warn the user if OAUTH is not enabled.
if (!app.context.cfg.oauth.enabled) {
  app.logger.warn('OAUTH is not enabled since no config was found')
}

// Redirect the user to the previously requested URL after authentication.
app.get(app.context.cfg.oauth.github.callback, async ctx => {
  const logger = ctx.logger.ns('kdot.auth')
  const { profile } = ctx.session.grant?.response || {}
  logger.info('Authentication', profile)
  logger.debug(ctx.session.grant)

  const redirectUri = ctx.session.grant?.dynamic?.redirect_uri
  if (redirectUri) {
    // Extract the previously requested URL from grant.
    const url = new URL(redirectUri)
    const to = new URL(url.searchParams.get('to'))
    logger.info('Redirecting to:', to.href)

    // Add the profile data received from GitHub to redis so that it can be
    // retrieved even if redirecting to a new domain (with a new
    // cookie/session).
    const id = to.searchParams.get('kdot-auth-proxy')
    logger.debug('Setting profile for:', id)
    const expiry = 1000 * 60 * 60
    await ctx.redis.client.set(id, JSON.stringify(profile), 'ex', expiry)

    ctx.redirect(to.href)
  } else {
    logger.warn('Redirect URI not found')
  }
})

// Allow users to logout of their session.
app.get('/kdot-auth-proxy/logout', ...nrg.logout)

// Handle the authorization check and proxy.
app.use(async ctx => {
  const logger = ctx.logger.ns('kdot.auth')

  // Determine the target from the Host header.
  const target = hosts[ctx.request.hostname]

  if (target) {
    let profile = ctx.session.profile || ctx.session.grant?.response?.profile

    logger.debug('Proxy attempt', { url: ctx.request.href, profile })

    if (!profile && ctx.query['kdot-auth-proxy']) {
      // If the URL has a kdot-auth-proxy query parameter, attempt to retrieve
      // the profile from redis using the value as the key.
      logger.debug('Get profile data for:', ctx.query['kdot-auth-proxy'])
      const json = await ctx.redis.client.get(ctx.query['kdot-auth-proxy'])
      profile = JSON.parse(json)
      logger.debug('Profile', profile)

      // Remove the profile associated with the temporary ID and save it to the
      // session instead.
      await ctx.redis.client.del(ctx.query['kdot-auth-proxy'])
      ctx.session.profile = profile
    }

    if (profile) {
      const isInOrg = target.org && profile.orgs.includes(target.org)
      if (isInOrg || target.users?.includes(profile.login)) {
        logger.debug('Proxying to:', target.url)

        // Tell koa not to respond since http-proxy will handle the response.
        ctx.respond = false

        // Proxy the request to the app's service.
        return proxy.web(ctx.req, ctx.res, { target: target.url }, err => {
          if (err) logger.error(err)
        })
      } else {
        // Return a 401 Unauthorized response.
        logger.error('Unauthorized', { target, profile })
        ctx.status = 401
      }
    } else {
      // Determine where the user should be redirected to after authentication.
      let url = new URL(ctx.request.href)
      if (target.proxyUrl) url = new URL(url.pathname, target.proxyUrl)

      // Create a temporary ID and use it as a query parameter to use as a key
      // when storing the profile in redis.
      const id = nanoid()
      url.searchParams.set('kdot-auth-proxy', id)
      logger.debug('Setting redirect_uri to:', url.href)

      // Redirect the user to authenticate with GitHub.
      const origin = process.env.REDIRECT_ORIGIN || ctx.origin
      const redirectUri = `${origin}/connect/github/callback?to=${url.href}`
      ctx.redirect(`${origin}/connect/github?redirect_uri=${redirectUri}`)
    }
  } else {
    // Log an error when the host isn't found since this is likely a
    // configuration issue.
    const msg = `Host not found: ${ctx.request.hostname}`
    logger.warn(msg)
    ctx.body = msg
  }
})

export default app
