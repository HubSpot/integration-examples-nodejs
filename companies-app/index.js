require('dotenv').config({path: '.env'});

const _ = require('lodash');
const path = require('path');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const SCOPES = 'contacts';
const REDIRECT_URI = `http://localhost:${PORT}/oauth-callback`;

let tokenStore = {};

const checkEnv = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();

  if (_.isNil(CLIENT_ID)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_ID env variable to proceed');
  if (_.isNil(CLIENT_SECRET)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_SECRET env variable to proceed');

  next();
};

const isAuthorized = () => {
  return !_.isEmpty(tokenStore.refresh_token);
};


const app = express();

const hubspot = new Hubspot({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  scopes: SCOPES,
});

app.use(express.static('css'));
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

app.get('/', async (req, res) => {
  try {
    if (!isAuthorized()) return res.redirect('/login');

    // Get all companies
    // GET /companies/v2/companies/paged
    // https://developers.hubspot.com/docs/methods/companies/get-all-companies
    console.log('Calling hubspot.companies.get API method. Retrieve all contacts.');
    const companiesResponse = await hubspot.companies.get({properties: ['name', 'domain']});
    console.log('Response from API', companiesResponse);

    res.render('companies', {companies: companiesResponse.companies});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/login', async (req, res) => {
  if (isAuthorized()) return res.redirect('/');
  res.render('login');
});

app.get('/oauth', async (req, res) => {

  const authorizationUrlParams = {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scopes: SCOPES,
  };

  // Use the client to get authorization Url
  // https://www.npmjs.com/package/hubspot
  console.log('Creating authorization Url');
  const authorizationUrl = hubspot.oauth.getAuthorizationUrl(authorizationUrlParams);
  console.log('Authorization Url', authorizationUrl);

  res.redirect(authorizationUrl);
});

app.get('/oauth-callback', async (req, res) => {
  const code = _.get(req, 'query.code');

  // Get OAuth 2.0 Access Token and Refresh Tokens
  // POST /oauth/v1/token
  // https://developers.hubspot.com/docs/methods/oauth2/get-access-and-refresh-tokens
  console.log('Retrieving access token by code:', code);
  tokenStore = await hubspot.oauth.getAccessToken({code});
  console.log('Retrieving access token result:', tokenStore);

  // Set token for the
  // https://www.npmjs.com/package/hubspot
  hubspot.setAccessToken((tokenStore.access_token));
  res.redirect('/');
});

app.get('/error', (req, res) => {
  res.render('error', {error: req.query.msg});
});

app.use((error, req, res, next) => {
  res.render('error', {error: error.message});
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
