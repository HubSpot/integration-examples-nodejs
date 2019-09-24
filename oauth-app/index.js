require('dotenv').config({path: '.env'});

const fs = require('fs');
const _ = require('lodash');
const express = require('express');
const Hubspot = require('hubspot');
const bodyParser = require('body-parser');


const PORT = 3000;
const CONTACTS_COUNT = 10;

const CONTACTS_PLACEHOLDER = '<!--contactsPlaceholder-->';

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

app.get('/contacts', async (req, res) => {
  try {
    const indexContent = fs.readFileSync('./html/contacts.html');

    // Get all contacts
    // GET /contacts/v1/lists/all/contacts/all
    // https://developers.hubspot.com/docs/methods/contacts/get_contacts
    console.log('Calling contacts.get API method. Retrieve all contacts.');
    const contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});
    console.log('Response from API', result);

    const contactsView = prepareContactsContent(indexContent, contactsResponse.contacts);

    res.setHeader('Content-Type', 'text/html');
    res.write(contactsView);
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
