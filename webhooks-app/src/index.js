require('dotenv').config({path: '.env'});

const url = require('url');
const _ = require('lodash');
const path = require('path');
const Hubspot = require('hubspot');
const express = require('express');
const bodyParser = require('body-parser');
const dbConnector = require('./js/db-connector');
const kafkaHelper = require('./js/kafka-helper');
const oauthController = require('./js/oauth-controller');
const contactsController = require('./js/contacts-controller');
const webhooksController = require('./js/webhooks-controller');
const eventsService = require('./js/events-service');

const PORT = 3000;
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

const HUBSPOT_AUTH_CONFIG = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

let hubspot;

const checkEnv = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();

  if (_.isNil(CLIENT_ID)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_ID env variable to proceed');
  if (_.isNil(CLIENT_SECRET)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_SECRET env variable to proceed');

  next();
};

const checkAuthorization = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();
  if (_.startsWith(req.url, '/auth/login')) return next();
  if (!oauthController.isAuthorized()) return res.redirect('/auth/login');

  next();
};

const setupHubspot = (req, res, next) => {
  if (_.isNil(hubspot)) {
    const hostUrl = url.format({
      protocol: 'https',
      hostname: req.get('host')
    });

    const redirectUri = `${hostUrl}/auth/oauth-callback`;
    hubspot = new Hubspot(_.extend({}, HUBSPOT_AUTH_CONFIG, {redirectUri}));
  }
  req.hubspot = hubspot;
  next();
};


const app = express();

app.use(express.static('public'));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true,
}));

app.use(bodyParser.json({
  limit: '50mb',
  extended: true,
}));

app.use(checkEnv);
app.use(setupHubspot);

app.get('/', checkAuthorization, (req, res) => {
  res.redirect('/contacts');
});

app.use('/auth', oauthController.getRouter());
app.use('/contacts', checkAuthorization, contactsController.getRouter());
app.use('/webhooks', checkAuthorization, webhooksController.getRouter());

app.get('/error', (req, res) => {
  res.render('error', {error: req.query.msg});
});

app.use((error, req, res, next) => {
  res.render('error', {error: error.message});
});

(async () => {
  try {
    await dbConnector.init();
    await kafkaHelper.init(eventsService.getHandler());
    const server = app.listen(PORT, () => console.log(`Listening on port:${PORT}`));

    process.on('SIGTERM', async () => {
      await dbConnector.close();

      server.close(() => {
        console.log('Process terminated')
      })
    })
  } catch (e) {
    console.log('Error during app start. ', e);
  }

})();
