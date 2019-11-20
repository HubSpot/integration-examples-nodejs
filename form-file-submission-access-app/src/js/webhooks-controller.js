const crypto = require('crypto')
const express = require('express')
const router = new express.Router()

const utils = require('./utils')

const SIGNATURE_HEADER = 'X-HubSpot-Signature'

exports.getRouter = () => {
  router.post('/', async (req, res) => {
    const webhooksEvents = req.body

    console.log('Received hook events:')
    utils.logJson(webhooksEvents)

    const events = JSON.parse(webhooksEvents)
    utils.logJson(events)

    res.sendStatus(200)
  })
  return router
}

exports.getWebhookVerification = () => {
  return (req, res, buf, encoding) => {
    try {
      if (req.originalUrl === '/webhooks') {
        const rawBody = buf.toString(encoding)
        const signature = req.header(SIGNATURE_HEADER)

        const secret = process.env.HUBSPOT_CLIENT_SECRET
        const hash = crypto
          .createHash('sha256')
          .update(secret + rawBody)
          .digest('hex')

        if (signature === hash) return
      }
    } catch (e) {
      console.log(e)
    }

    throw new Error('Unauthorized webhook or error with request processing!')
  }
}
