const _ = require('lodash');
const dbConnector = require('./db-connector');


const GET_CONTACTS_SQL = 'select distinct object_id from events order by id desc limit 10';
const GET_ALL_EVENTS_SQL = 'select * from events order by occurred_at asc';
const GET_NEW_EVENTS_COUNT_SQL = 'select count(*) from events where shown = 0';
const SET_EVENTS_SHOWN_SQL = 'update events set shown = 1 where shown = 0';


module.exports = {
  getContacts: () => dbConnector.run(GET_CONTACTS_SQL),

  getEventsForContact: (contactId) => {
    const getEventsForContactSql = `select event_type from events where object_id = ${contactId} order by occurred_at asc`;
    return dbConnector.run(getEventsForContactSql);
  },

  addEvent: (event) => {
    const INSERT_EVENT_SQL = `insert into events (event_id, event_type, object_id, occurred_at) values (${event.eventId}, '${event.subscriptionType}', ${event.objectId}, ${event.occurredAt})`;
    return dbConnector.run(INSERT_EVENT_SQL);
  },

  getAllEvents: () => dbConnector.run(GET_ALL_EVENTS_SQL),

  setAllWebhooksEventsShown: () => dbConnector.run(SET_EVENTS_SHOWN_SQL),

  getNewEventsCount: async () => {
    const QUERY_KEY = `count(*)`;
    const eventsCountResponse = await dbConnector.run(GET_NEW_EVENTS_COUNT_SQL);
    return eventsCountResponse[0][QUERY_KEY];
  }
};
