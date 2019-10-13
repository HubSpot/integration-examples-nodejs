require('dotenv').config({path: '.env'});
require('csv-express');

const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;
const CONTACTS_COUNT = 10;

const CONTACT_OBJECT_TYPE = 'CONTACT';

const CONTACTS_PLACEHOLDER = '<!--contactsPlaceholder-->';
const PROPERTIES_PLACEHOLDER = '<!--propertiesPlaceholder-->';
const LIST_ITEMS_PLACEHOLDER = '<!--listItemsPlaceholder-->';
const LIST_ACTION_PLACEHOLDER = '<!--listActionPlaceholder-->';
const ENGAGEMENTS_PLACEHOLDER = '<!--engagementsPlaceholder-->';
const HIDDEN_MARKER_CLASS_NAME = 'hidden';
const HIDDEN_MARKER_CLASS_PLACEHOLDER = '<!--hidden-->';
const NEW_ENGAGEMENT_ACTION_PLACEHOLDER = '<!--newEngagementActionPlaceholder-->';
const CONTACT_VID_PLACEHOLDER = /\<\!--contactVidPlaceholder--\>/g;


const checkEnv = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next();
  if (_.isNil(process.env.HUBSPOT_API_KEY)) return res.redirect('/error?msg=Please set HUBSPOT_API_KEY env variable to proceed');

  next();
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
    const search = _.get(req, 'query.search') || '';
    const indexContent = fs.readFileSync('./html/contacts.html');
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
    const contactsView = prepareContactsContent(indexContent, contactsResponse.contacts);

    res.setHeader('Content-Type', 'text/html');
    res.write(contactsView);
    res.end();
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts/new', async (req, res) => {
  try {
    const indexContent = fs.readFileSync('./html/list.html');

    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const properties = await hubspot.contacts.properties.get();
    console.log('Response from API', properties);

    // Get List of Owners
    // GET /owners/v2/owners/
    // https://developers.hubspot.com/docs/methods/owners/get_owners
    console.log('Calling hubspot.owners.get API method. Retrieve all contacts owners');
    const owners = await hubspot.owners.get();
    console.log('Response from API', owners);

    const editableProperties = getEditableProperties(properties);
    const contactProperties = getContactEditableProperties({}, editableProperties);

    const propertyView = setContactPropertiesContent(indexContent, contactProperties, owners, '/contacts');
    const propertyAndEngagementView = setEngagementsContent(propertyView, null, false);

    res.setHeader('Content-Type', 'text/html');
    res.write(propertyAndEngagementView);
    res.end();
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts/:vid', async (req, res) => {
  try {
    const vid = _.get(req, 'params.vid');
    if (_.isNil(vid)) return res.redirect('/error?msg=Missed contact');

    const indexContent = fs.readFileSync('./html/list.html');

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
    const properties = await hubspot.contacts.properties.get();
    console.log('Response from API', properties);

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
    const engagements = await hubspot.engagements.getAssociated(CONTACT_OBJECT_TYPE, vid);
    console.log('Response from API', engagements);

    const editableProperties = getEditableProperties(properties);
    const contactProperties = getContactEditableProperties(contact.properties, editableProperties);
    const propertyView = setContactPropertiesContent(indexContent, contactProperties, owners, `/contacts/${vid}`);
    const propertyAndEngagementView = setEngagementsContent(propertyView, engagements.results, true, `/contacts/${vid}/engagement`);

    res.setHeader('Content-Type', 'text/html');
    res.write(propertyAndEngagementView);
    res.end();
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/contacts/:vid/engagement', async (req, res) => {
  try {
    const vid = _.get(req, 'params.vid');
    if (_.isNil(vid)) return res.redirect('/error?msg=Missed contact');

    const indexContent = fs.readFileSync('./html/engagements.html');
    const  content = _.replace(indexContent, CONTACT_VID_PLACEHOLDER, vid);
    res.setHeader('Content-Type', 'text/html');
    res.write(content);
    res.end();
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
    const indexContent = fs.readFileSync('./html/properties.html');

    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const properties = await hubspot.contacts.properties.get();
    console.log('Response from API', properties);

    const propertiesView = setPropertiesContent(indexContent, properties);
    res.setHeader('Content-Type', 'text/html');
    res.write(propertiesView);
    res.end();
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
  const indexContent = fs.readFileSync('./html/list.html');
  const propertyDetails = getPropertyDetails();
  const propertyView = setContactPropertiesContent(indexContent, propertyDetails, null, '/properties');

  res.setHeader('Content-Type', 'text/html');
  res.write(propertyView);
  res.end();
});

app.get('/properties/:name', async (req, res) => {
  try {
    const name = _.get(req, 'params.name');
    if (_.isNil(name)) return res.redirect('/error?msg=Missed property');
    const indexContent = fs.readFileSync('./html/list.html');

    // Get All Contacts Properties
    // GET /properties/v1/contacts/properties
    // https://developers.hubspot.com/docs/methods/contacts/v2/get_contacts_properties
    console.log('Calling contacts.properties.get API method. Retrieve all contacts properties');
    const properties = await hubspot.contacts.properties.get();
    console.log('Response from API', properties);

    const property = _.find(properties, {name});
    const propertyDetails = getPropertyDetails(property);
    const propertyView = setContactPropertiesContent(indexContent, propertyDetails, null,`/properties/${name}`);
    res.setHeader('Content-Type', 'text/html');
    res.write(propertyView);
    res.end();
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

    res.csv(csvContent, true, { 'Content-disposition': 'attachment; filename=contacts.csv'});
  } catch (e) {
    console.error(e);
    res.redirect(`/error?msg=${e.message}`);
  }
});

app.get('/error', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end();
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));


const prepareContactsContent = (indexContent, contacts) => {
  try {
    let contactsTableContent = '';
    contacts.forEach(contact => {
      const companyName = _.get(contact, 'properties.company.value') || '';
      contactsTableContent += `<tr><td><a href="/contacts/${contact.vid}">${contact.vid}</a></td><td>${getFullName(contact.properties)}</td><td>${companyName}</td></tr>\n`
    });

    return _.replace(indexContent, CONTACTS_PLACEHOLDER, contactsTableContent)
  } catch (e) {
    console.log(e)
  }
};

const toDate = (value) => {
  return _.isNil(value) ? null : (new Date(value)).getTime();
};

const setPropertiesContent = (indexContent, propertiesList) => {
  let propertiesTableContent = '';

  try {
    propertiesList.forEach(property => {
      propertiesTableContent += `<tr><td><a href="/properties/${property.name}">${property.name}</a></td><td>${property.label}</td><td>${property.description}</td><td>${property.type}</td></tr>\n`
    });
    return _.replace(indexContent, PROPERTIES_PLACEHOLDER, propertiesTableContent)
  } catch (e) {
    console.log(e)
  }
};

const setContactPropertiesContent = (indexContent, itemDetails, owners, listAction) => {
  try {
    let listContent = '';
    _.each(itemDetails, (details, key) => {
      listContent += key === 'hubspot_owner_id' && owners
        ? getSelectRow(key, details, owners)
        : getInputRow(key, details);
    });
    let content = _.replace(indexContent, LIST_ITEMS_PLACEHOLDER, listContent);
    return _.replace(content, LIST_ACTION_PLACEHOLDER, listAction)
  } catch (e) {
    console.log(e)
  }
};

const setEngagementsContent = (content, engagements, isShown = true, action) => {
  try {
    if (!isShown) {
      return _.replace(content, HIDDEN_MARKER_CLASS_PLACEHOLDER, isShown ? '' : HIDDEN_MARKER_CLASS_NAME);
    }

    const engagementsContent = _.reduce(engagements, (engagementsContent, engagementDetails) => {
      const details = _.pick(engagementDetails.engagement, ['id', 'type']);
      details.title = _.get(engagementDetails, 'metadata.title');
      console.log(details);
      engagementsContent += `<tr><td>${details.id}</td><td>${details.type}</td><td>${details.title || ''}</td></tr>`;
      return engagementsContent;
    }, '');


    const contentWithAction = _.replace(content, NEW_ENGAGEMENT_ACTION_PLACEHOLDER, action);
    return _.replace(contentWithAction, ENGAGEMENTS_PLACEHOLDER, engagementsContent)
  } catch (e) {
    console.log(e)
  }
};

const getInputRow = (key, details) => {
  const value = _.isNil(details.value) ? '' : details.value;
  return `<label for="${key}">${details.label}</label><input name="${key}" id="${key}" type="text" value="${value}">`
};

const getSelectRow = (key, details, owners) => {
  const value = _.isNil(details.value) ? '' : details.value;
  const options = _.reduce(owners, (options, owner) => {
    let selected = owner.ownerId == value ? 'selected' : '';
    options += `<option value="${owner.ownerId}" ${selected} >${owner.firstName} ${owner.lastName}</option>`;
    return options;
  }, '');

  return `<label for="${key}">${details.label}</label><select name="${key}" id="${key}"><option value="">Not assigned</option>${options}</select>`
};

const getEditableProperties = (properties) => {
  return _.reduce(properties, (editableProps, property) => {
    if (!isReadOnly(property)) editableProps[property.name] = {name: property.name, label: property.label};
    return editableProps
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
