const fetch = require('node-fetch')
const { verify, sign } = require('jsonwebtoken')
const qs = require('querystring')

const defaultOptions = {
  cookie: 'koa:jwt',
  header: 'Authorization',
  secret: '',

  authUrl: '/auth/google',
  callbackUrl: '/auth/google/callback',
  requireAuth: false
}

const { CLIENT_ID, CLIENT_SECRET, CLIENT_URL } = process.env

const loadTokenState = async (ctx, opts) => {
  const {cookie, secret, header} = opts
  const token = ctx.request.get(header) || ctx.cookies.get(cookie)

  try {
    const decodedToken = await new Promise((resolve, reject) => {
      verify(token, secret, (err, decoded) =>
        err ? reject(err) : resolve(decoded)
      )
    })
    ctx.state.user = decodedToken
  } catch (err) {
    ctx.state.user = null
  }

  ctx.isAuthenticated = () => !!ctx.state.user
  ctx.logout = () => ctx.cookies.set(cookie, null)
}

/*
 * @params {Object} options
 *  - {String} secret
 *  - {Function* (token, loginInfo)} getUser
 *  - {Function* (ctx)} onSuccess
 *  - {Function* (ctx)} [onFailure]
 *  - {String} [cookie]
 *  - {String} [header]
 *  - {String} [authUrl]
 *  - {String} [callbackUrl]
 *  - {Boolean} [requireAuth]
 */
module.exports = (opts = {}) =>
  async (ctx, next) => {
    opts = {...defaultOptions, ...opts}
    const callbackUrl = `${CLIENT_URL}${opts.callbackUrl}`
    await loadTokenState(ctx, opts)

    // handle authorization sequence
    if (ctx.path === opts.authUrl) {
      const baseUrl = 'https://accounts.google.com/o/oauth2/auth?response_type=code'
      return ctx.redirect(`${baseUrl}&redirect_uri=${callbackUrl}&client_id=${CLIENT_ID}&scope=email`)
    }

    // handle callback
    if (ctx.path === opts.callbackUrl) {
      const {secret, cookie, getUser} = opts

      if (ctx.query && ctx.query.error) {
        throw new Error('Failed to authenticate')
      }

      // get access token
      const body = qs.stringify({
        code: ctx.query.code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code'
      })

      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/token', {
          body,
          method: 'post',
          headers: {'content-type': 'application/x-www-form-urlencoded'}
        })
        const json = await res.json()
        const info = json.id_token
          ? JSON.parse(new Buffer(json.id_token.split('.')[1], 'base64').toString('utf8'))
          : null
        const user = await getUser(json.access_token, info)
        if (!user) throw new Error('Invalid user')

        const token = await new Promise((resolve, reject) => {
          sign(user, secret, (err, token) => err ? reject(err) : resolve(token))
        })
        ctx.cookies.set(cookie, token, {overwrite: true})
        ctx.body = {token}
        if (opts.onSuccess) await opts.onSuccess(ctx)
        return
      } catch (e) {
        if (opts.onFailure) await opts.onFailure(ctx)
        throw new Error('Invalid user')
      }
    }

    if (opts.requireAuth && !ctx.isAuthenticated()) {
      ctx.throw(401)
    }

    return next()
  }
