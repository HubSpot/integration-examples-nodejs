require('dotenv').config({path: '.env'});

const url = require('url');
const _ = require('lodash');
const path = require('path');
const ngrok = require('ngrok');
const Hubspot = require('hubspot');
const express = require('express');
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const dbHelper = require('./js/db-helper');
const dbConnector = require('./js/db-connector');
const kafkaHelper = require('./js/kafka-helper');
const eventsService = require('./js/events-service');
const oauthController = require('./js/oauth-controller');
const contactsController = require('./js/contacts-controller');
const webhooksController = require('./js/webhooks-controller');

const PORT = 3000;
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;

const HUBSPOT_AUTH_CONFIG = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
};

let hubspot;
let tokens = {};

const checkEnv = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();

  if (_.isNil(CLIENT_ID)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_ID env variable to proceed');
  if (_.isNil(CLIENT_SECRET)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_SECRET env variable to proceed');

  next();
};

const getHostUrl = (req) => {
  return url.format({
    protocol: 'https',
    hostname: req.get('host')
  });
};

const isTokenExpired = () => {
  return Date.now() >= Date.parse(tokens.updated_at) + tokens.expires_in * 1000;
};

const setupHubspot = async (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();
  if (_.startsWith(req.url, '/login')) return next();

  if (tokens.initialized && hubspot) {
    req.hubspot = hubspot;
    next();
    return;
  }

  if (_.isNil(tokens.refresh_token)) {
    console.log('Missed tokens, check DB');
    tokens = await dbHelper.getTokens() || {};
    console.log('Tokens from DB:', tokens);
  }

  if (_.isNil(hubspot)) {
    const redirectUri = `${getHostUrl(req)}/auth/oauth-callback`;
    const refreshToken = tokens.refresh_token;
    console.log('Creating HubSpot api wrapper instance');
    hubspot = new Hubspot(_.extend({}, HUBSPOT_AUTH_CONFIG, {redirectUri, refreshToken}));
  }
  req.hubspot = hubspot;


  if (!tokens.initialized && !_.isNil(tokens.refresh_token)) {
    console.log('Need to initialized tokens!');

    if (isTokenExpired()) {
      console.log('HubSpot: need to refresh token');
      const hubspotTokens = await req.hubspot.refreshAccessToken();
      tokens = await dbHelper.updateTokens(hubspotTokens);
      console.log('Updated tokens', tokens);
    } else {
      console.log('HubSpot: set access token');
      req.hubspot.setAccessToken(tokens.access_token);
    }
    tokens.initialized = true;
    console.log('Tokens are initialized');
  } else if (!_.startsWith(req.url, '/auth')) {
    console.log('Not initialized tokens!');
    return res.redirect('/login');
  }

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
  verify: webhooksController.getWebhookVerification()
}));

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use(checkEnv);
app.use(setupHubspot);

app.get('/', (req, res) => {
  res.redirect('/contacts');
});

app.get('/login', async (req, res) => {
  if (tokens.initialized) return res.redirect('/');
  res.render('login');
});

app.use('/auth', oauthController.getRouter());
app.use('/contacts', contactsController.getRouter());
app.use('/webhooks', webhooksController.getRouter());

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

    const server = app.listen(PORT, () => {
      console.log(`Listening on port: ${PORT}`);
      Promise
        .delay(100)
        .then(() => ngrok.connect(PORT))
        .then((url) => console.log('Please use:', url));
    });

    process.on('SIGTERM', async () => {
      await dbConnector.close();

      server.close(() => {
        console.log('Process terminated')
      });
    });
  } catch (e) {
    console.log('Error during app start. ', e);
  }

})();
