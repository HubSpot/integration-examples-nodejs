const _ = require('lodash');

exports.logJson = (data) => {
  console.log('Response from API', JSON.stringify(data, null, 2));
};
