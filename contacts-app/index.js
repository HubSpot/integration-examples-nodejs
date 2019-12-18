require('dotenv').config({path: '.env'});
require('csv-express');

const _ = require('lodash');
const path = require('path');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;
const CONTACTS_COUNT = 10;
const CONTACT_OBJECT_TYPE = 'CONTACT';


const checkEnv = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();
  if (_.isNil(process.env.HUBSPOT_API_KEY)) return res.redirect('/error?msg=Please set HUBSPOT_API_KEY env variable to proceed');

  next();
};

const prepareContactsContent = (contacts) => {
  return _.map(contacts, (contact) => {
    const companyName = _.get(contact, 'properties.company.value') || '';
    return {vid: contact.vid, name: getFullName(contact.properties), companyName}
  });
};

const toDate = (value) => {
  return _.isNil(value) ? null : (new Date(value)).getTime();
};

const prepareEngagements = (engagements) => {
  return _.map(engagements, (engagementDetails) => {
    const details = _.pick(engagementDetails.engagement, ['id', 'type']);
    details.title = _.get(engagementDetails, 'metadata.title') || '';
    console.log(details);
    return details;
  });
};

const getEditableProperties = (properties) => {
  return _.reduce(properties, (editableProps, property) => {
    if (!isReadOnly(property)) editableProps[property.name] = {name: property.name, label: property.label};
    return editableProps
  }, {})
};

const getMutableProperties = (properties) => {
  return _.reduce(properties, (mutableProps, property) => {
    if (!isMutable(property)) mutableProps[property.name] = property;
    return mutableProps
  }, {})
};

const getContactEditableProperties = (contactProperties, editableProperties) => {
  return _.reduce(editableProperties, (contactEditableProperties, property, propertyName) => {
    contactEditableProperties[propertyName] = property;
    const contactProperty = contactProperties[propertyName];
    if (contactProperty) contactEditableProperties[propertyName].value = contactProperty.value;

    return contactEditableProperties;
  }, {})
};

const getFullName = (contactProperties) => {
  const firstName = _.get(contactProperties, 'firstname.value') || '';
  const lastName = _.get(contactProperties, 'lastname.value') || '';
  return `${firstName} ${lastName}`
};

const isReadOnly = (property) => {
  return property.readOnlyValue || property.calculated
};

const isMutable = (property) => {
  return property.readOnlyDefinition
};

const getPropertyDetails = (property = {}) => {
  return {
    name: {label: 'Name', value: property.name},
    label: {label: 'Label', value: property.label},
    description: {label: 'Description', value: property.description},
    groupName: {label: 'Group Name', value: property.groupName},
    type: {label: 'Type', value: property.type},
  }
};

const toCsv = (contacts, properties) => {
  return _.map(contacts, (contact) => {

    const csvContact = _.reduce(properties, (csvContact, property) => {
      csvContact[property.label] = _.get(contact, `properties.${property.name}.value`) || '';
      return csvContact;
    }, {});

    console.log(csvContact);
    return csvContact
  });
};


const app = express();
const hubspot = new Hubspot({apiKey: process.env.HUBSPOT_API_KEY});

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

app.use(express.static('public'));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(checkEnv);

app.get('/', async (req, res) => {
  res.redirect('/contacts')
});

app.post('/contacts', async (req, res) => {
  try {
    const email = _.get(req, 'body.email');
    if (!_.isNil(email)) {
      const properties = _.map(req.body, (value, property) => {
        return {property, value}
      });

      // Create or update a contact
      // POST /contacts/v1/contact/createOrUpdate/email/:contact_email
      // https://developers.hubspot.com/docs/methods/contacts/create_or_update
      console.log('Calling contacts.create_or_update API method. Create new contact with email:', email);
      const result = await hubspot.contacts.createOrUpdate(email, {properties});
      console.log('Response from API', result);

      res.redirect('/contacts');
    }
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`)
  }
});

app.post('/contacts/:vid', async (req, res) => {
  try {
    const email = _.get(req, 'body.email');
    if (!_.isNil(email)) {
      const properties = _.map(req.body, (value, property) => {
        return {property, value}
      });

      // Create or update a contact
      // POST /contacts/v1/contact/createOrUpdate/email/:contact_email
      // https://developers.hubspot.com/docs/methods/contacts/create_or_update
      console.log('Calling contacts.create_or_update API method. Update contact with email:', email);
      const result = await hubspot.contacts.createOrUpdate(email, {properties});
      console.log('Response from API', result);

      res.redirect('/contacts');
    }
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts', async (req, res) => {
  try {
    const search = _.get(req, 'query.search');
    let contactsResponse = {contacts: []};
    if (_.isNil(search)) {

      // Get all contacts
      // GET /contacts/v1/lists/all/contacts/all
      // https://developers.hubspot.com/docs/methods/contacts/get_contacts
      console.log('Calling contacts.get API method. Retrieve all contacts.');
      contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});
      console.log('Response from API', contactsResponse);

    } else {

      // Search for contacts by email, name, or company name
      // GET /contacts/v1/search/query
      // https://developers.hubspot.com/docs/methods/contacts/search_contacts
      console.log('Calling contacts.search API method. Retrieve contacts with search query:', search);
      contactsResponse = await hubspot.contacts.search(search);
      console.log('Response from API', contactsResponse);

    }

    res.render('contacts', { contacts: prepareContactsContent(contactsResponse.contacts), search});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts/new', async (req, res) => {
  try {
    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const hubspotProperties = await hubspot.contacts.properties.get();
    console.log('Response from API', hubspotProperties);

    // Get List of Owners
    // GET /owners/v2/owners/
    // https://developers.hubspot.com/docs/methods/owners/get_owners
    console.log('Calling hubspot.owners.get API method. Retrieve all contacts owners');
    const owners = await hubspot.owners.get();
    console.log('Response from API', owners);

    const editableProperties = getEditableProperties(hubspotProperties);
    const properties = getContactEditableProperties({}, editableProperties);

    res.render('list', {items: properties, owners, action: '/contacts'});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts/:vid', async (req, res) => {
  try {
    const vid = _.get(req, 'params.vid');
    if (_.isNil(vid)) return res.redirect('/error?msg=Missed contact');

    // Get a contact record by its vid
    // GET /contacts/v1/contact/vid/:vid/profile
    // https://developers.hubspot.com/docs/methods/contacts/get_contact
    console.log('Calling contacts.getById API method. Retrieve a contacts by vid:', vid);
    const contact = await hubspot.contacts.getById(vid);
    console.log('Response from API', contact);

    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const hubspotProperties = await hubspot.contacts.properties.get();
    console.log('Response from API', hubspotProperties);

    // Get List of Owners
    // GET /owners/v2/owners/
    // https://developers.hubspot.com/docs/methods/owners/get_owners
    console.log('Calling hubspot.owners.get API method. Retrieve all contacts owners');
    const owners = await hubspot.owners.get();
    console.log('Response from API', owners);

    // Get Associated Engagements
    // GET /engagements/v1/engagements/associated/:objectType/:objectId/paged
    // https://developers.hubspot.com/docs/methods/engagements/get_associated_engagements
    console.log('Calling hubspot.engagements.getAssociated API method. Retrieve all contacts engagements');
    const hubspotEngagements = await hubspot.engagements.getAssociated(CONTACT_OBJECT_TYPE, vid);
    console.log('Response from API', hubspotEngagements);

    const editableProperties = getEditableProperties(hubspotProperties);
    const properties = getContactEditableProperties(contact.properties, editableProperties);
    const engagements = prepareEngagements(hubspotEngagements.results);

    res.render('list', {items: properties, engagements, owners, action: `/contacts/${vid}`, engagementAction: `/contacts/${vid}/engagement`});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts/:vid/engagement', async (req, res) => {
  try {
    const vid = _.get(req, 'params.vid');
    if (_.isNil(vid)) return res.redirect('/error?msg=Missed contact');
    res.render('engagements', {vid});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.post('/contacts/:vid/engagement', async (req, res) => {
  try {
    const vid = _.get(req, 'params.vid');
    let payload = _.clone(req.body);
    payload = _.set(payload, 'metadata.startTime', toDate(_.get(payload, 'metadata.startTime')));
    payload = _.set(payload, 'metadata.endTime', toDate(_.get(payload, 'metadata.endTime')));

    // Create an Engagement
    // POST /engagements/v1/engagements
    // https://developers.hubspot.com/docs/methods/engagements/create_engagement
    console.log('Calling hubspot.engagements.create API method. Create contact engagement');
    const result = await hubspot.engagements.create(payload);
    console.log('Response from API', result);

    res.redirect(`/contacts/${vid}`);
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/properties', async (req, res) => {
  try {
    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const properties = await hubspot.contacts.properties.get();
    console.log('Response from API', properties);

    const mutableProperties = getMutableProperties(properties);

    res.render('properties', {properties: mutableProperties});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.post('/properties', async (req, res) => {
  try {

    // Create a contact property
    // POST /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/create_contacts_property
    console.log('Calling contacts.properties.create API method. Create contact property');
    const result = await hubspot.contacts.properties.create(req.body);
    console.log('Response from API', result);

    res.redirect('/properties');
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.post('/properties/:name', async (req, res) => {
  try {
    const name = _.get(req, 'params.name');

    // Update a contact property
    // PUT /properties/v1/contacts/properties/named/:property_name
    // https://developers.hubspot.com/docs/methods/contacts/v2/update_contact_property
    console.log('Calling contacts.properties.update API method. Update contact property, with name:', name);
    const result = await hubspot.contacts.properties.update(name, req.body);
    console.log('Response from API', result);

    res.redirect('/properties')
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/properties/new', async (req, res) => {
  try {

    // Get Contact Property Groups
    // GET /properties/v1/contacts/groups
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contact_property_groups
    console.log('Calling hubspot.contacts.properties.getGroups API method. Retrieve all contact property groups');
    const groups = await hubspot.contacts.properties.getGroups();
    console.log('Response from API', groups);

    res.render('list', {items: getPropertyDetails(), action: '/properties', groups});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/properties/:name', async (req, res) => {
  try {
    const name = _.get(req, 'params.name');
    if (_.isNil(name)) return res.redirect('/error?msg=Missed property');

    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const hubspotProperties = await hubspot.contacts.properties.get();
    console.log('Response from API', hubspotProperties);

    // Get Contact Property Groups
    // GET /properties/v1/contacts/groups
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contact_property_groups
    console.log('Calling hubspot.contacts.properties.getGroups API method. Retrieve all contact property groups');
    const groups = await hubspot.contacts.properties.getGroups();
    console.log('Response from API', groups);

    const property = _.find(hubspotProperties, {name});
    const properties = getPropertyDetails(property);
    res.render('list', {items: properties, action:  `/properties/${name}`, groups});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/export', async (req, res) => {

  try {

    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const properties = await hubspot.contacts.properties.get();
    console.log('Response from API', properties);

    // Get all contacts
    // GET /contacts/v1/lists/all/contacts/all
    // https://developers.hubspot.com/docs/methods/contacts/get_contacts
    console.log('Calling contacts.get API method. Retrieve all contacts.');
    const contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});
    console.log('Response from API', contactsResponse);
    const csvContent = toCsv(contactsResponse.contacts, properties);

    res.csv(csvContent, true, {'Content-disposition': 'attachment; filename=contacts.csv'});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/error', (req, res) => {
  res.render('error', {error: req.query.msg});
});

app.use((error, req, res, next) => {
  res.render('error', {error: error.message});
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
