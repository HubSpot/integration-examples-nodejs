const _ = require('lodash');
const dbConnector = require('./db-connector');

const INSERT_EVENT_SQL = 'insert into events (event_id, event_type, object_id, occurred_at) values (?, ?, ?, ?)';
const GET_CONTACTS_SQL = 'select distinct object_id from events order by id desc limit 10';
const GET_EVENTS_FOR_CONTACT_SQL = 'select event_type from events where object_id = ? order by occurred_at asc';


exports.getContacts = () => dbConnector.all(GET_CONTACTS_SQL);
exports.getEventsForContact = (contactId) => dbConnector.all(GET_EVENTS_FOR_CONTACT_SQL, contactId);
exports.addEvent = (event) => dbConnector.run(INSERT_EVENT_SQL, [event.eventId, event.subscriptionType, event.objectId, event.occurredAt])
