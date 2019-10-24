const _ = require('lodash');
const dbHelper = require('./db-helper');


exports.getHandler = () => {
  return async (message) => {
    const events = JSON.parse(message.value);
    const eventsPromises = _.map(events, (event) => {
      return dbHelper.addEvent(event);
    });
    await Promise.all(eventsPromises);
  };
};
