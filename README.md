# koa-google-jwt
JWT-based authentication using Google OAuth for Koa

## ENV

```
CLIENT_ID     // google OAuth api id
CLIENT_SECRET // google OAuth api secret
CLIENT_URL    // base url to use for callback url
```

## Usage

```js
const koa = require('koa')
const googleJwt = require('koa-google-jwt')

const app = koa()
app.use(googleJwt({
  cookie: 'koa:jwt',       // name to set cookie
  secret: '',              // secret used for signing JWTs
  header: 'Authorization', // default header for reading JWTs
  authUrl: '/auth/google', // route used to initiate auth process
  callbackUrl: '/auth/google/callback', // route to redirect to after auth
  requireAuth: true        // require authentication in this middleware
}))

// meanwhile...

router.get('/protected', ctx => {
  ctx.body = `Welcome ${ctx.state.user.name}!`
})

// API
ctx.state.user
ctx.isAuthenticated()
ctx.logout()
```
