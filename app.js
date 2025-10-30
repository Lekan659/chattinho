// At the very top of app.js
require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Import your Sequelize models
var db = require('./models');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tenantsRouter = require('./routes/tenantroutes');
var webhookRouter = require('./routes/webhookroutes');
const { default: axios } = require('axios');

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// DB connection check
db.sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connection has been established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
  });

// db.sequelize.sync({ alter: true })
//   .then(() => console.log('✅ DB synced!'))
//   .catch(err => console.error('❌ DB sync failed:', err)); 
// (Optional for dev) sync models automatically
// db.sequelize.sync();

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode']
  const challenge = req.query['hub.challenge']
  const token = req.query['hub.verify_token']

  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})


app.post('/webhook', async (req, res) => {
    // console.log('Received webhook event');
    // console.log(JSON.stringify(req.body, null, 2));
    // console.log('Received webhook event');
    res.status(200).send('EVENT_RECEIVED');
})


// sendTextMessage()

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/tenants', tenantsRouter);
app.use('/webhooks', webhookRouter)

module.exports = app;
