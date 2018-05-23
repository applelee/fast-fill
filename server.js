const Koa = require('koa');
const app = new Koa();
const views = require('koa-views');
const router = require('koa-router')()

// app.use(logger());
app.use(require('koa-static')(__dirname + '/'));

// views
app.use(views(__dirname + '/', {
  extension: 'html'
}));

// router config
router.get('*', async (ctx, next) => {
  await ctx.render('image-data')
})

// front end routes poxy
app.use(router.routes());

// start server
app.listen(3300,() => {
  console.log('open ','127.0.0.1:3300')
})
