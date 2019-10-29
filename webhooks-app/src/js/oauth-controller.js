const _ = require('lodash');
const express = require('express');
const router = new express.Router();
const dbHelper = require('./db-helper');

const SCOPE = 'contacts';


exports.getRouter = () => {
  router.get('/oauth', async (req, res) => {

    // Use the client to get authorization Url
    // https://www.npmjs.com/package/hubspot#obtain-your-authorization-url
    const authorizationUrl = req.hubspot.oauth.getAuthorizationUrl({scope: SCOPE});
    console.log('Authorization Url:', authorizationUrl);

    res.redirect(authorizationUrl);
  });

  router.get('/oauth-callback', async (req, res) => {
    const code = _.get(req, 'query.code');

    // Get OAuth 2.0 Access Token and Refresh Tokens
    // POST /oauth/v1/token
    // https://developers.hubspot.com/docs/methods/oauth2/get-access-and-refresh-tokens
    //
    // https://www.npmjs.com/package/hubspot#obtain-an-access-token-from-an-authorization_code
    console.log('Retrieving access token by code:', code);
    const tokens = await req.hubspot.oauth.getAccessToken({code});
    await dbHelper.saveTokens(tokens);
    res.redirect('/');
  });

  return router;
};
