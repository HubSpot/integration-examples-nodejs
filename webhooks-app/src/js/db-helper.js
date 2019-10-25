const _ = require('lodash');
const dbConnector = require('./db-connector');

const GET_EVENTS_COUNT = 'select count(distinct object_id) as result from events';
const GET_NEW_EVENTS_COUNT = 'select count(*) from events where shown = 0';
const SET_EVENTS_SHOWN = 'update events set shown = 1 where shown = 0';


module.exports = {
  addEvent: (event) => {
    const INSERT_EVENT_SQL = `insert into events (event_id, event_type, object_id, occurred_at) values (${event.eventId}, '${event.subscriptionType}', ${event.objectId}, ${event.occurredAt})`;
    return dbConnector.run(INSERT_EVENT_SQL);
  },

  getContactIds: async (offset, limit) => {
    const GET_CONTACT_IDS = `select distinct object_id from events limit ${limit} offset ${offset}`;
    const result = await dbConnector.run(GET_CONTACT_IDS);
    return _.map(result, 'object_id');
  },

  getEvents: (contactIds) => {
    const GET_ALL_EVENTS = `select * from events where object_id in (${_.toString(contactIds)})`;
    console.log(GET_ALL_EVENTS);
    return dbConnector.run(GET_ALL_EVENTS);
  },

  getEventsCount: async () => {
    const result = await dbConnector.run(GET_EVENTS_COUNT);
    return _.get(result, '0.result') || 0;
  },

  setAllWebhooksEventsShown: () => dbConnector.run(SET_EVENTS_SHOWN),

  getNewEventsCount: async () => {
    const QUERY_KEY = `count(*)`;
    const eventsCountResponse = await dbConnector.run(GET_NEW_EVENTS_COUNT);
    return eventsCountResponse[0][QUERY_KEY];
  }
};
