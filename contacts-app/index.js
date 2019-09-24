require('dotenv').config({path: '.env'});

const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;
const CONTACTS_COUNT = 10;

const CONTACTS_PLACEHOLDER = '<!--contactsPlaceholder-->';
const PROPERTIES_PLACEHOLDER = '<!--propertiesPlaceholder-->';
const LIST_ITEMS_PLACEHOLDER = '<!--listItemsPlaceholder-->';
const LIST_ACTION_PLACEHOLDER = '<!--listActionPlaceholder-->';

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
      console.log('Response from API', result);

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

    const contactProperties = getEditableProperties(properties);
    const propertyView = setListContent(indexContent, contactProperties, '/contacts');

    res.setHeader('Content-Type', 'text/html');
    res.write(propertyView);
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

    const editableProperties = getEditableProperties(properties);
    const contactProperties = getContactEditableProperties(contact.properties, editableProperties);
    const propertyView = setListContent(indexContent, contactProperties, `/contacts/${vid}`);

    res.setHeader('Content-Type', 'text/html');
    res.write(propertyView);
    res.end();
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
  const propertyView = setListContent(indexContent, propertyDetails, '/properties');

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
    const propertyView = setListContent(indexContent, propertyDetails, `/properties/${name}`);
    res.setHeader('Content-Type', 'text/html');
    res.write(propertyView);
    res.end();
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

const setListContent = (indexContent, itemDetails, listAction) => {
  try {
    let listContent = '';
    _.each(itemDetails, (details, key) => {
      const value = _.isNil(details.value) ? '' : details.value;
      listContent += `<label for="${key}">${details.label}</label><input name="${key}" id="${key}" type="text" value="${value}">`
    });
    let content = _.replace(indexContent, LIST_ITEMS_PLACEHOLDER, listContent);
    return _.replace(content, LIST_ACTION_PLACEHOLDER, listAction)
  } catch (e) {
    console.log(e)
  }
};

const getEditableProperties = (properties) => {
  return _.reduce(properties, (editableProps, property) => {
    if (!isReadOnly(property)) editableProps[property.name] = {name: property.name, label: property.label};
    return editableProps
  }, {})
};
const getContactEditableProperties = (contactProperties, editableProperties) => {
  return _.reduce(contactProperties, (contactProperties, property, propertyName) => {
    if (_.includes(_.keys(editableProperties), propertyName)) {
      contactProperties[propertyName] = editableProperties[propertyName];
      contactProperties[propertyName].value = property.value
    }
    return contactProperties
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
