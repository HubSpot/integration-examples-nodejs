const _ = require('lodash');
const express = require('express');
const router = new express.Router();
const dbHelper = require('./db-helper');

const EVENTS_COUNT_PER_PAGE = 25;

const getEventForView = (event) => {
  const type = _
    .chain(event)
    .get('event_type')
    .split('.')
    .last()
    .value();
  const name = _.get(event, 'property_name');
  const value = _.get(event, 'property_value');

  return {type, name, value};
};

const getFullName = (contact) => {
  const firstName = _.get(contact, 'properties.firstname.value') || '';
  const lastName = _.get(contact, 'properties.lastname.value') || '';
  return `${firstName} ${lastName}`
};

const prepareContactsForView = (events, contacts) => {
  return _.reduce(events, (eventsForView, event) => {
    const contactId = _.get(event, 'object_id');

    if (_.isNil(eventsForView[contactId])) {
      const contact = contacts[contactId];
      const name = contact ? getFullName(contact) : 'Deleted';
      eventsForView[contactId] = {name, events: []}
    }

    const eventForView = getEventForView(event);
    eventsForView[contactId].events.push(eventForView);
    return eventsForView;
  }, {});
};


exports.getRouter = () => {
  router.get('/', async (req, res) => {
    try {

      const offset = req.query.offset ? parseInt(req.query.offset) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit) : EVENTS_COUNT_PER_PAGE;

      const totalCount = await dbHelper.getEventsCount();
      const contactIds = await dbHelper.getContactIds(offset, limit);

      const pagesCount = Math.ceil(totalCount / EVENTS_COUNT_PER_PAGE);

      let paginationConfig = _.map(Array(pagesCount), (v, index) => {
        const link = `/contacts/?offset=${index * EVENTS_COUNT_PER_PAGE}`;
        const aClass = index * EVENTS_COUNT_PER_PAGE === offset ? 'active': '';
        return { label: index + 1, link, aClass };
      });


      paginationConfig = paginationConfig.length < 2
        ? paginationConfig
        : _.concat(
          [{label: '<<', link: '/contacts'}],
          paginationConfig,
          [{label: '>>', link: `/contacts?offset=${(pagesCount - 1)* EVENTS_COUNT_PER_PAGE}`}]);

      console.log('Calling contacts.getByIdBatch API method. Retrieve contacts.');
      // Get a batch of contacts by vid
      // GET /contacts/v1/contact/vids/batch/
      // https://developers.hubspot.com/docs/methods/contacts/get_batch_by_vid
      const contactsResponse = await req.hubspot.contacts.getByIdBatch(contactIds);
      console.log(contactsResponse);

      const events = await dbHelper.getEvents(contactIds);
      const contacts = prepareContactsForView(events, contactsResponse);
      await dbHelper.setAllWebhooksEventsShown();

      res.render('contacts', {contacts, paginationConfig});
    } catch (e) {
      console.error(e);
      res.redirect(`/error?msg=${e.message}`);
    }
  });

  return router;
};
