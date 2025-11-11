// At the very top of app.js
require('dotenv').config();
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Import your Sequelize models
var db = require('./models');
const cors = require('cors');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tenantsRouter = require('./routes/tenantroutes');
var authRouter = require('./routes/authroutes');
var productRoutes = require('./routes/productroutes');
var orderRoutes = require('./routes/orderroutes');
const messagesRoutes = require('./routes/messages');

var webhookRouter = require('./routes/webhookroutes');
const { default: axios } = require('axios');
const { authenticate } = require('./middleware/authMiddleware');

const WEBHOOK_VERIFY_TOKEN = 'my-verify-token'




var app = express();

app.use(cors({
  origin: 'http://localhost:5002', // Your frontend URL
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Chattinho API Docs"
}));

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
async function sendTextMessage() {
    const response = await axios({
        url: 'https://graph.facebook.com/v22.0/724637504057287/messages',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: '2348122808622',
            type: 'text',
            text:{
                body: 'This is a text message'
            }
        })
    })


    console.log(response.data) 
}
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
    console.log('Received webhook event');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('Received webhook event');
    res.status(200).send('EVENT_RECEIVED');
})


// sendTextMessage()

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/tenants', tenantsRouter);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/webhooks', webhookRouter);
// const messagesRoutes = require('./routes/messages');
app.use('/api', messagesRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});


module.exports = app;
