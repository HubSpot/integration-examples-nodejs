const _ = require('lodash');
const express = require('express');
const router = new express.Router();

const CONTACTS_COUNT = 10;

const getEventName = (event) => {
  return _
    .chain(event)
    .get('event_type')
    .split('.')
    .last()
    .value();
};

const getFullName = (contact) => {
  const firstName = _.get(contact, 'properties.firstname.value') || '';
  const lastName = _.get(contact, 'properties.lastname.value') || '';
  return `${firstName} ${lastName}`
};

const prepareContactsForView = (events, contacts) => {

  const eventsForView = _.reduce(events, (eventsForView, event) => {
    const contactId = _.get(event, 'object_id');

    if (_.isNil(eventsForView[contactId])) {
      const contact = _.find(contacts, {vid: contactId});
      const name = contact ? getFullName(contact) : 'Deleted';
      eventsForView[contactId] = {name, events: []}
    }

    const eventName = getEventName(event);
    eventsForView[contactId].events.push(eventName);
    return eventsForView;
  }, {});
  return eventsForView;
};


exports.getRouter = (dbHelper) => {
  router.get('/', async (req, res) => {
    try {

      // Get all contacts
      // GET /contacts/v1/lists/all/contacts/all
      // https://developers.hubspot.com/docs/methods/contacts/get_contacts
      console.log('Calling contacts.get API method. Retrieve all contacts.');
      const events = await dbHelper.getAllEvents();
      const contactsResponse = await req.hubspot.contacts.get({count: CONTACTS_COUNT});
      const contacts = prepareContactsForView(events, contactsResponse.contacts);
      await dbHelper.setAllWebhooksEventsShown();

      res.render('contacts', {contacts});
    } catch (e) {
      console.error(e);
      res.redirect(`/error?msg=${e.message}`);
    }
  });

  return router;
};
