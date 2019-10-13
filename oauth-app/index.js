require('dotenv').config({path: '.env'});

const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;
const CONTACTS_COUNT = 10;

const CONTACTS_PLACEHOLDER = '<!--contactsPlaceholder-->';

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
app.use(express.static('html'));

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
    const indexContent = fs.readFileSync('./html/oauth.html');

    if (!isAuthorized()) {
      const oauthButton = '<a class="navigation-link" href="/oauth">Click to retrieve contacts with OAuth authorization</a>';
      const contactsView = _.replace(indexContent, CONTACTS_PLACEHOLDER, oauthButton);
      res.setHeader('Content-Type', 'text/html');
      res.write(contactsView);
      res.end();
    } else {

      // Get all contacts
      // GET /contacts/v1/lists/all/contacts/all
      // https://developers.hubspot.com/docs/methods/contacts/get_contacts
      console.log('Calling contacts.get API method. Retrieve all contacts.');
      const contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});
      console.log('Response from API', contactsResponse);

      const contactsView = prepareContactsContent(indexContent, contactsResponse.contacts);

      res.setHeader('Content-Type', 'text/html');
      res.write(contactsView);
      res.end();
    }
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.use('/oauth', async (req, res) => {

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

app.use('/oauth-callback', async (req, res) => {
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
  res.setHeader('Content-Type', 'text/html');
  res.write(`<a href="/contacts">Home</a>`);
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end();
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));


const prepareContactsContent = (indexContent, contacts) => {
  try {
    let contactsTableContent = '';
    contacts.forEach(contact => {
      const companyName = _.get(contact, 'properties.company.value') || '';
      contactsTableContent += `<tr><td>${contact.vid}</td><td>${getFullName(contact.properties)}</td><td>${companyName}</td></tr>\n`
    });

    return _.replace(indexContent, CONTACTS_PLACEHOLDER, contactsTableContent)
  } catch (e) {
    console.log(e)
  }
};

const getFullName = (contactProperties) => {
  const firstName = _.get(contactProperties, 'firstname.value') || '';
  const lastName = _.get(contactProperties, 'lastname.value') || '';
  return `${firstName} ${lastName}`
};
