const _ = require('lodash');
const express = require('express');
const Promise = require('bluebird');
const router = new express.Router();
const dbHelper = require('./db-helper');

const CONTACTS_COUNT = 10;

const getContactPromise = async (id, name) => {
  const events = await dbHelper.getEventsForContact(id);
  return {id, name, events};
};

const prepareContactsForView = (contacts) => {
  const contactsPromises = _.map(contacts, (contact) => {
    const id = _.get(contact, 'vid');
    const firstName = _.get(contact, 'properties.firstname.value') || '';
    const lastName = _.get(contact, 'properties.lastname.value') || '';
    const name = `${firstName} ${lastName}`;
    return getContactPromise(id, name);
  });
  return Promise.all(contactsPromises);
};


exports.getRouter = (hubspot, db) => {
  router.get('/', async (req, res) => {
    try {

      // Get all contacts
      // GET /contacts/v1/lists/all/contacts/all
      // https://developers.hubspot.com/docs/methods/contacts/get_contacts
      console.log('Calling contacts.get API method. Retrieve all contacts.');
      const contactsResponse = await hubspot.contacts.get({count: CONTACTS_COUNT});
      const contacts = await prepareContactsForView(contactsResponse.contacts, db);

      res.render('contacts', {contacts});
    } catch (e) {
      console.error(e);
      res.redirect(`/error?msg=${e.message}`);
    }
  });

  return router;
};
