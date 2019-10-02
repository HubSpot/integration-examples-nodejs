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

const checkAuthorization = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();
  if (_.startsWith(req.url, '/login')) return next();
  if (!isAuthorized()) return res.redirect('/login');

  next();
};

const preparePropertiesForView = (companyProperties, allProperties) => {
  return _
    .chain(allProperties)
    .filter((property) => {
      return !property.readOnlyValue && !property.calculated
    })
    .map((property) => {
      return {
        name: property.name,
        label: property.label,
        value: _.get(companyProperties, `${property.name}.value`)
      }
    })
    .value();
};

const preparePropertiesForRequest = (properties = {}) => {
  return _.map(properties, (value, name) => {
      return {name, value}
    })
};


const app = express();

const hubspot = new Hubspot({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  scopes: SCOPES,
});

const getAllCompanies = async () => {

  // Get all companies
  // GET /companies/v2/companies/paged
  // https://developers.hubspot.com/docs/methods/companies/get-all-companies
  console.log('Calling hubspot.companies.get API method. Retrieve all companies.');
  const companiesResponse = await hubspot.companies.get({properties: ['name', 'domain']});
  console.log('Response from API', companiesResponse);

  return companiesResponse;
};

const getCompanyByDomain = async (domain) => {

  // Search for companies by domain
  // POST /companies/v2/domains/:domain/companies
  // https://developers.hubspot.com/docs/methods/companies/search_companies_by_domain
  console.log('Calling hubspot.companies.getByDomain API method. Retrieve companies by domain.');

  // TODO: uncomment when client will be fixed
  // const companiesResponse = await hubspot.companies.getByDomain(domain);

  const companiesResponse = await hubspot.companies.get({properties: ['name', 'domain']});

  console.log('Response from API', companiesResponse);

  return companiesResponse;
};

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

app.get('/', checkAuthorization, (req, res) => {
  res.redirect('/companies');
});

app.get('/companies', checkAuthorization, async (req, res) => {
  try {

    const search = _.get(req, 'query.search');
    const companiesResponse = _.isNil(search)
      ? await getAllCompanies()
      : await getCompanyByDomain(search);

    res.render('companies', {companies: companiesResponse.companies});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/companies/:companyId', checkAuthorization, async (req, res) => {
  try {
    const companyId = _.get(req, 'params.companyId');

    // Get a Company
    // GET /companies/v2/companies/:companyId
    // https://developers.hubspot.com/docs/methods/companies/get_company
    console.log('Calling hubspot.companies.getById API method. Retrieve company by id.');
    const company = await hubspot.companies.getById(companyId);
    console.log('Response from API', company);

    // Get all Company Properties
    // GET /properties/v1/companies/properties/
    // https://developers.hubspot.com/docs/methods/companies/get_company_properties
    console.log('Calling hubspot.companies.properties.get API method. Retrieve company properties.');
    const allProperties = await hubspot.companies.properties.get();
    console.log('Response from API', allProperties);
    const properties = preparePropertiesForView(company.properties, allProperties);

    res.render('company', {companyId, properties});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.post('/companies/:companyId', checkAuthorization, async (req, res) => {
  try {
    const companyId = _.get(req, 'params.companyId');
    const properties = preparePropertiesForRequest(_.get(req, 'body'));

    // Update a Company
    // PUT /companies/v2/companies/:companyId
    // https://developers.hubspot.com/docs/methods/companies/update_company
    console.log('Calling hubspot.companies.update API method. Updating company properties.');
    const result = await hubspot.companies.update(companyId, {properties});
    console.log('Response from API', result);

    res.redirect(`/companies/${companyId}`);
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/login', async (req, res) => {
  console.log('login', isAuthorized());
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
