import nrg from '@ianwalter/nrg'

const app = nrg.createApp({ name: 'GitHub Stub', port: 3007 })

app.get('/auth', ctx => {
  //
  const redirect = new URL(ctx.query.redirect_uri)

  //
  redirect.searchParams.set('state', ctx.query.state)

  // Grant is expecting a code to be returned even though it won’t be used.
  redirect.searchParams.set('code', 'abc123')

  // Redirect to the constructed redirect URL.
  ctx.redirect(redirect.href)
})

app.post('/access', ctx => {
  // Return an access token to Grant.
  ctx.body = {
    access_token: 'bAtch1Cam3Vp',
    token_type: 'bearer',
    scope: 'read:org'
  }
})

app.get('/profile', ctx => {
  // Return profile data.
  ctx.body = {
    login: 'ianwalter',
    id: 456123,
    node_id: 'abc123',
    avatar_url: 'https://avatars.githubusercontent.com/u/456123?v=4',
    gravatar_id: '',
    url: 'https://api.github.com/users/ianwalter',
    html_url: 'https://github.com/ianwalter',
    followers_url: 'https://api.github.com/users/ianwalter/followers',
    following_url: 'https://api.github.com/users/ianwalter/following{/other_user}',
    gists_url: 'https://api.github.com/users/ianwalter/gists{/gist_id}',
    starred_url: 'https://api.github.com/users/ianwalter/starred{/owner}{/repo}',
    subscriptions_url: 'https://api.github.com/users/ianwalter/subscriptions',
    organizations_url: 'https://api.github.com/users/ianwalter/orgs',
    repos_url: 'https://api.github.com/users/ianwalter/repos',
    events_url: 'https://api.github.com/users/ianwalter/events{/privacy}',
    received_events_url: 'https://api.github.com/users/ianwalter/received_events',
    type: 'User',
    site_admin: false,
    name: 'Ian Walter',
    company: 'binx health',
    blog: 'https://ianwalter.dev',
    location: 'Farmington Valley, CT',
    email: 'pub@ianwalter.dev',
    hireable: true,
    bio: null,
    twitter_username: 'IanWalter',
    public_repos: 182,
    public_gists: 9,
    followers: 84,
    following: 247,
    created_at: '2009-09-01T18:29:47Z',
    updated_at: '2021-05-15T00:50:06Z'
  }
})

app.serve()
