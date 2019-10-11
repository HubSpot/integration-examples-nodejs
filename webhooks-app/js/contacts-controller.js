const _ = require('lodash');
const express = require('express');
const router = new express.Router();

const CONTACTS_COUNT = 10;


const prepareContactsForView = (contacts) => {
  return _.map(contacts, (contact) => {
    const id = _.get(contact, 'vid');
    const firstName = _.get(contact, 'properties.firstname.value') || '';
    const lastName = _.get(contact, 'properties.lastname.value') || '';
    const name = `${firstName} ${lastName}`;
    const hooks = ['asd', 'qwe', '123'];

    return {id, name, hooks}
  })
};


exports.getRouter = (hubspot) => {
  router.get('/', async (req, res) => {
    try {

      // Get all contacts
      // GET /contacts/v1/lists/all/contacts/all
      // https://developers.hubspot.com/docs/methods/contacts/get_contacts
      console.log('Calling contacts.get API method. Retrieve all contacts.');
      const contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});
      const contacts = prepareContactsForView(contactsResponse.contacts);

      res.render('contacts', {contacts});
    } catch (e) {
      console.error(e);
      res.redirect(`/error?msg=${e.message}`);
    }
  });

  return router;
};
