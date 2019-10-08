require('dotenv').config({path: '.env'});

const _ = require('lodash');
const path = require('path');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;

const CONTACT_TO_COMPANY_DEFINITION_ID = 1;
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const HUBSPOT_ASSOCIATION_DEFINITION = 'HUBSPOT_DEFINED';
const SCOPES = 'contacts';
const CONTACTS_COUNT = 10;
const ADD_ACTION = 'Add selected to company';
const DELETE_ACTION = 'Delete selected from Company';
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

const prepareContactsForView = (contacts) => {
  return _.map(contacts, (contact) => {
    const id = _.get(contact, 'vid');
    const firstNameProperty = _.find(contact.properties, {name: 'firstname'});
    const lastNameProperty = _.find(contact.properties, {name: 'lastname'});
    const name = `${_.get(firstNameProperty, 'value') || ''} ${_.get(lastNameProperty, 'value') || ''}`;
    return {id, name}
  })
};

const prepareAllContactsForView = (contacts) => {
  return _.map(contacts, (contact) => {
    const id = _.get(contact, 'vid');
    const firstName = _.get(contact, 'properties.firstname.value') || '';
    const lastName = _.get(contact, 'properties.lastname.value') || '';
    const name = `${firstName} ${lastName}`;
    return {id, name}
  })
};

const prepareCompaniesForView = (companies) => {
  return _.map(companies, (company) => {
    const id = _.get(company, 'companyId');
    const name = _.get(company, 'properties.name.value');
    const domain = _.get(company, 'properties.domain.value');
    return {id, name, domain}
  })
};

const logResponse = (response) => {
  console.log('Response from API', JSON.stringify(response, null, 2));
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
  logResponse(companiesResponse);

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
  logResponse(companiesResponse);

  return companiesResponse;
};

const createCompany = async (properties) => {

  // Create a Company
  // POST /companies/v2/companies/
  // https://developers.hubspot.com/docs/methods/companies/create_company
  console.log('Calling hubspot.companies.create API method. Create company.');
  return hubspot.companies.create({properties});
};

const updateCompany = (id, properties) => {

  // Update a Company
  // PUT /companies/v2/companies/:companyId
  // https://developers.hubspot.com/docs/methods/companies/update_company
  console.log('Calling hubspot.companies.update API method. Updating company properties.');
  return hubspot.companies.update(id, {properties});
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
    const companies = prepareCompaniesForView(companiesResponse.companies);
    console.log(companies);
    res.render('companies', {companies});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/companies/new', checkAuthorization, async (req, res) => {
  try {

    // Get all Company Properties
    // GET /properties/v1/companies/properties/
    // https://developers.hubspot.com/docs/methods/companies/get_company_properties
    console.log('Calling hubspot.companies.properties.get API method. Retrieve company properties.');
    const allProperties = await hubspot.companies.properties.get();
    logResponse(allProperties);
    const properties = preparePropertiesForView({}, allProperties);

    res.render('company', {companyId: '', properties, contacts: null});
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
    logResponse(company);

    // Get Contacts at a Company
    // GET /companies/v2/companies/:companyId/contacts
    // https://developers.hubspot.com/docs/methods/companies/get_company_contacts
    console.log('Calling hubspot.companies.getContacts API method. Retrieve company contacts by id.');
    const contactsResponse = await hubspot.companies.getContacts(companyId);
    logResponse(contactsResponse);

    // Get all Company Properties
    // GET /properties/v1/companies/properties/
    // https://developers.hubspot.com/docs/methods/companies/get_company_properties
    console.log('Calling hubspot.companies.properties.get API method. Retrieve company properties.');
    const allProperties = await hubspot.companies.properties.get();
    logResponse(allProperties);

    const contacts = prepareContactsForView(contactsResponse.contacts);
    const properties = preparePropertiesForView(company.properties, allProperties);
    res.render('company', {companyId, properties, contacts});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/companies/:companyId/contacts', checkAuthorization, async (req, res) => {
  try {
    const search = _.get(req, 'query.search') || '';
    const companyId = _.get(req, 'params.companyId');
    let contactsResponse = {contacts: []};
    if (_.isNil(search)) {

      // Get all contacts
      // GET /contacts/v1/lists/all/contacts/all
      // https://developers.hubspot.com/docs/methods/contacts/get_contacts
      console.log('Calling contacts.get API method. Retrieve all contacts.');
      contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});

    } else {

      // Search for contacts by email, name, or company name
      // GET /contacts/v1/search/query
      // https://developers.hubspot.com/docs/methods/contacts/search_contacts
      console.log('Calling contacts.search API method. Retrieve contacts with search query:', search);
      contactsResponse = await hubspot.contacts.search(search);

    }
    logResponse(contactsResponse);

    const contacts = prepareAllContactsForView(contactsResponse.contacts);
    res.render('contacts', {companyId, contacts});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.post('/companies/:companyId/contacts', checkAuthorization, async (req, res) => {
  try {
    const companyId = _.get(req, 'params.companyId');
    const action = _.get(req, 'body.action');
    const contactsIds = _.chain(req)
      .get('body.contactsIds')
      .values()
      .value();

    if (!_.includes([ADD_ACTION, DELETE_ACTION], action)) {
      return res.redirect(`/error?msg=Unknown contacts action: ${action}`);
    }

    const data = _.map(contactsIds, (id) => {
      return  {
        fromObjectId: id,
        toObjectId: companyId,
        category: HUBSPOT_ASSOCIATION_DEFINITION,
        definitionId: CONTACT_TO_COMPANY_DEFINITION_ID
      };
    });

    if (action === DELETE_ACTION) {

      // Delete multiple associations between CRM objects
      // PUT /crm-associations/v1/associations/delete-batch
      // https://developers.hubspot.com/docs/methods/crm-associations/batch-delete-associations
      console.log('Calling hubspot.crm.associations.deleteBatch API method. Delete contacts associations.');
      const companyUpdateResponse = await hubspot.crm.associations.deleteBatch(data);
      logResponse(companyUpdateResponse);

    } else {

      // Create multiple associations between CRM objects
      // PUT /crm-associations/v1/associations/create-batch
      // https://developers.hubspot.com/docs/methods/crm-associations/batch-associate-objects
      console.log('Calling hubspot.crm.associations.createBatch API method. Add contacts associations.');
      const companyUpdateResponse = await hubspot.crm.associations.createBatch(data);
      logResponse(companyUpdateResponse);

    }
    res.redirect(`/companies/${companyId}`);
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.post('/companies/:companyId*?', checkAuthorization, async (req, res) => {
  try {
    const companyId = _.get(req, 'params.companyId');
    const properties = preparePropertiesForRequest(_.get(req, 'body'));

    const result = _.isNil(companyId)
      ? await createCompany(properties)
      : await updateCompany(companyId, properties);

    logResponse(result);

    const id = _.get(result, 'companyId');
    res.redirect(`/companies/${id}`);
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/login', async (req, res) => {
  console.log('Is logged-in', isAuthorized());
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
  logResponse(tokenStore);

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
