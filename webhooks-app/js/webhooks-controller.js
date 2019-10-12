const _ = require('lodash');
const express = require('express');
const router = new express.Router();
const dbHelper = require('./db-helper');

const utils = require('./utils');


exports.getRouter = (hubspot) => {
  router.post('/', async (req, res) => {
    console.log('Hook -------------------');
    utils.logJson(req.body);
    await dbHelper.addEvent(req.body);
    res.sendStatus(200);
  });

  return router;
};
