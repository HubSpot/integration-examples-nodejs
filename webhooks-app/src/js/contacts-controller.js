const _ = require('lodash');
const express = require('express');
const router = new express.Router();
const dbHelper = require('./db-helper');

const EVENTS_COUNT_PER_PAGE = 25;

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
      const contact = contacts[contactId];
      const name = contact ? getFullName(contact) : 'Deleted';
      eventsForView[contactId] = {name, events: []}
    }

    const eventName = getEventName(event);
    eventsForView[contactId].events.push(eventName);
    return eventsForView;
  }, {});
  return eventsForView;
};


exports.getRouter = () => {
  router.get('/', async (req, res) => {
    try {

      const offset = req.query.offset ? parseInt(req.query.offset) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit) : EVENTS_COUNT_PER_PAGE;

      const totalCount = await dbHelper.getEventsCount();
      const contactIds = await dbHelper.getContactIds(offset, limit);

      console.log('Calling contacts.getByIdBatch API method. Retrieve contacts.');
      // Get a batch of contacts by vid
      // GET /contacts/v1/contact/vids/batch/
      // https://developers.hubspot.com/docs/methods/contacts/get_batch_by_vid
      const contactsResponse = await req.hubspot.contacts.getByIdBatch(contactIds);
      console.log(contactsResponse);

      const events = await dbHelper.getEvents(contactIds);
      const contacts = prepareContactsForView(events, contactsResponse);
      await dbHelper.setAllWebhooksEventsShown();

      res.render('contacts', {contacts, totalCount});
    } catch (e) {
      console.error(e);
      res.redirect(`/error?msg=${e.message}`);
    }
  });

  return router;
};
