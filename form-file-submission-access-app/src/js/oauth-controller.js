const debug = require('debug')('filesubmit:auth')

const _ = require('lodash')
const express = require('express')
const router = new express.Router()

const SCOPE = _.join(['contacts', 'files', 'forms-uploaded-files'], ' ')

exports.getRouter = (updateTokens) => {
  router.get('/oauth', async (req, res) => {
    // Use the client to get authorization Url
    // https://www.npmjs.com/package/hubspot#obtain-your-authorization-url
    const authorizationUrl = req.hubspot.oauth.getAuthorizationUrl({
      scope: SCOPE,
    })
    debug('authorization Url: %s', authorizationUrl)

    res.redirect(authorizationUrl)
  })

  router.get('/oauth-callback', async (req, res) => {
    const code = _.get(req, 'query.code')

    // Get OAuth 2.0 Access Token and Refresh Tokens
    // POST /oauth/v1/token
    // https://developers.hubspot.com/docs/methods/oauth2/get-access-and-refresh-tokens
    //
    // https://www.npmjs.com/package/hubspot#obtain-an-access-token-from-an-authorization_code
    debug('get tokens by code:', code)
    const tokens = await req.hubspot.oauth.getAccessToken({ code })
    updateTokens(tokens)
    res.redirect('/')
  })

  return router
}
