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
  cookie: 'myapp:jwt',
  secret: 'topsecret',
  getUser: async (token, loginInfo) => {
    return await db.getUser({email: loginInfo.email})
  },
  onSuccess: ctx => ctx.redirect('/'),
  onFailure: ctx => ctx.redirect('/')
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
