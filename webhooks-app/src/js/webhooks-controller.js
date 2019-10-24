const _ = require('lodash');
const express = require('express');
const router = new express.Router();
const dbHelper = require('./db-helper');

const utils = require('./utils');
const kafkaHelper = require('./kafka-helper');


exports.getRouter = () => {
  router.post('/', async (req, res) => {
    const events = req.body;

    console.log('Received hook events:');
    utils.logJson(events);
    await kafkaHelper.send(events);
    res.sendStatus(200);
  });

  router.get('/new', async (req, res) => {
    const notShownEventsCount = await dbHelper.getNewEventsCount();
    res.status(200).jsonp({notShownEventsCount});
  });

  return router;
};
