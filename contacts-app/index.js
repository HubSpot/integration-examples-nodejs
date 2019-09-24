require('dotenv').config({path: '.env'});
const express = require('express');
const _ = require('lodash');
const fs = require('fs');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const CONTACTS_PLACEHOLDER = '<!--contactsPlaceholder-->';
const PROPERTIES_PLACEHOLDER = '<!--propertiesPlaceholder-->';
const LIST_ITEMS_PLACEHOLDER = '<!--listItemsPlaceholder-->';
const LIST_ACTION_PLACEHOLDER = '<!--listActionPlaceholder-->';
const CONTACTS_COUNT = 10;

const PORT = 3000;
const app = express();
const hubspot = new Hubspot({apiKey: process.env.HUBSPOT_API_KEY});


app.use(express.static('css'));

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
      const result = await hubspot.contacts.createOrUpdate(email, {properties});
      console.log(result)
    }
  } catch (e) {
    console.error(e)
  }
  res.redirect('/contacts')
});

app.post('/contacts/:vid', async (req, res) => {
  try {
    const email = _.get(req, 'body.email');
    if (!_.isNil(email)) {
      const properties = _.map(req.body, (value, property) => {
        return {property, value}
      });
      const result = await hubspot.contacts.createOrUpdate(email, {properties});
      console.log(result)
    }
  } catch (e) {
    console.error(e)
  }
  res.redirect('/contacts')
});

app.get('/contacts', async (req, res) => {
  const search = _.get(req, 'query.search') || '';
  const indexContent = fs.readFileSync('./html/contacts.html');
  const contactsResponse = search ?
    await hubspot.contacts.search(search) :
    await hubspot.contacts.get({count: CONTACTS_COUNT});
  const contactsView = prepareContactsContent(indexContent, contactsResponse.contacts);

  res.setHeader('Content-Type', 'text/html');
  res.write(contactsView);
  res.end()
});

app.get('/contacts/new', async (req, res) => {
  const indexContent = fs.readFileSync('./html/list.html');
  const properties = await hubspot.contacts.properties.get();
  const contactProperties = getEditableProperties(properties);
  const propertyView = setListContent(indexContent, contactProperties, '/contacts');

  res.setHeader('Content-Type', 'text/html');
  res.write(propertyView);
  res.end()
});

app.get('/contacts/:vid', async (req, res) => {
  const vid = _.get(req, 'params.vid');
  if (_.isNil(vid)) return res.redirect('/error?msg=Missed contact');

  const indexContent = fs.readFileSync('./html/list.html');
  const contact = await hubspot.contacts.getById(vid);
  const properties = await hubspot.contacts.properties.get();
  const editableProperties = getEditableProperties(properties);
  const contactProperties = getContactEditableProperties(contact.properties, editableProperties);
  const propertyView = setListContent(indexContent, contactProperties, `/contacts/${vid}`);

  res.setHeader('Content-Type', 'text/html');
  res.write(propertyView);
  res.end()
});

app.get('/properties', async (req, res) => {
  const indexContent = fs.readFileSync('./html/properties.html');
  const propertiesList = await hubspot.contacts.properties.get();
  const propertiesView = setPropertiesContent(indexContent, propertiesList);

  res.setHeader('Content-Type', 'text/html');
  res.write(propertiesView);
  res.end()
});

app.post('/properties', async (req, res) => {
  try {
    await hubspot.contacts.properties.create(req.body)
  } catch (e) {
    console.error(e)
  }
  res.redirect('/properties')
});

app.post('/properties/:name', async (req, res) => {
  try {
    const name = _.get(req, 'params.name');
    await hubspot.contacts.properties.update(name, req.body)
  } catch (e) {
    console.error(e)
  }
  res.redirect('/properties')
});

app.get('/properties/new', async (req, res) => {
  const indexContent = fs.readFileSync('./html/list.html');
  const propertyDetails = getPropertyDetails();
  const propertyView = setListContent(indexContent, propertyDetails, '/properties');

  res.setHeader('Content-Type', 'text/html');
  res.write(propertyView);
  res.end()
});

app.get('/properties/:name', async (req, res) => {
  const name = _.get(req, 'params.name');
  if (_.isNil(name)) return res.redirect('/error?msg=Missed property');

  const indexContent = fs.readFileSync('./html/list.html');
  const propertiesList = await hubspot.contacts.properties.get();
  const property = _.find(propertiesList, {name});
  const propertyDetails = getPropertyDetails(property);
  const propertyView = setListContent(indexContent, propertyDetails, `/properties/${name}`);

  res.setHeader('Content-Type', 'text/html');
  res.write(propertyView);
  res.end()
});

app.get('/error', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.write(`<h4>Error: ${req.query.msg}</h4>`);
  res.end()
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
