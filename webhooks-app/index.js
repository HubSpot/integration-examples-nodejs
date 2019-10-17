require('dotenv').config({path: '.env'});

const url = require('url');
const _ = require('lodash');
const path = require('path');
const Hubspot = require('hubspot');
const express = require('express');
const bodyParser = require('body-parser');
const dbConnector = require('./js/db-connector');
(async () => dbConnector.init())();
const dbHelper = require('./js/db-helper').getHelper(dbConnector);

const oauthController = require('./js/oauth-controller');
const contactsController = require('./js/contacts-controller');
const webhooksController = require('./js/webhooks-controller');

const PORT = 3000;
const SCOPES = 'contacts';
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = `http://localhost:${PORT}/auth/oauth-callback`;

const HUBSPOT_AUTH_CONFIG = {
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  scopes: SCOPES
};
const hubspot = new Hubspot(HUBSPOT_AUTH_CONFIG);

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
app.use((req, res, next) => {
  console.log(req.protocol, req.get('host'), req.originalUrl);
  next();
});

app.get('/', checkAuthorization, (req, res) => {
  res.redirect('/contacts');
});

app.use('/auth', oauthController.getRouter(hubspot, HUBSPOT_AUTH_CONFIG));
app.use('/contacts', checkAuthorization, contactsController.getRouter(hubspot, dbHelper));
app.use('/webhooks', checkAuthorization, webhooksController.getRouter(hubspot, dbHelper));

app.get('/error', (req, res) => {
  res.render('error', {error: req.query.msg});
});

app.use((error, req, res, next) => {
  res.render('error', {error: error.message});
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
