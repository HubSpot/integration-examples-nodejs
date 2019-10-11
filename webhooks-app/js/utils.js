const _ = require('lodash');

exports.logJson = (response) => {
  console.log('Response from API', JSON.stringify(response, null, 2));
};
