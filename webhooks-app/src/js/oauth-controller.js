const _ = require('lodash');
const express = require('express');
const router = new express.Router();

const SCOPE = 'contacts';


let tokenStore = {};

const isAuthorized = () => {
  return !_.isEmpty(tokenStore.refresh_token);
};

exports.isAuthorized = isAuthorized;

exports.getRouter = () => {
  router.get('/login', async (req, res) => {
    const isLoggedIn = isAuthorized();

    console.log('Is logged-in', isLoggedIn);
    if (isLoggedIn) return res.redirect('/');
    res.render('login');
  });

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
    tokenStore = await req.hubspot.oauth.getAccessToken({code});
    console.log(tokenStore);

    // Set token for the
    // https://www.npmjs.com/package/hubspot#oauth
    req.hubspot.setAccessToken((tokenStore.access_token));
    res.redirect('/');
  });

  return router;
};
