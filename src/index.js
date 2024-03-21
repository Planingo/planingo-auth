const Koa = require('koa')
const Router = require('@koa/router')
const bodyParser = require('koa-bodyparser')
const service = require('./service')
const { error } = require('./errors')

const app = new Koa()

const router = new Router()

router.post('/login', async (ctx) => {
  checkFields(['email', 'password'], ctx.request.body.input)
  ctx.body = await service.login(ctx.request.body.input)
})

router.post('/account', async (ctx) => {
  checkFields(['email', 'password'], ctx.request.body.input)
  ctx.body = await service.createAccount(ctx.request.body.input)
})

function checkFields (fields, input) {
  const missingFields = fields.filter(field => !input[field])
  if (missingFields.length !== 0) {
    throw error(400, `missing fields ${missingFields.join(', ')}`)
  }
}

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    console.error('Error while handling', ctx.URL.pathname, ':', err)
    if (err.expose) {
      ctx.body = { message: err.message, code: `${err.status || 500}` }
      ctx.status = err.status
    } else {
      ctx.body = { message: "Unexpected server error", code: `${err.status || 500}` }
      ctx.status = err.status || 500
    }
  }
})
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

const port = process.env.PORT || 4000

app.listen(port, () => {
  console.info(`listening on port ${port}`)
})
