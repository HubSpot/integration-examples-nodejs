const _ = require('lodash')
const crypto = require('crypto')
const express = require('express')
const router = new express.Router()

const PROPERTY_NAME = 'propertyName'
const PROPERTY_VALUE = 'propertyValue'
const SUBSCRIPTION_TYPE = 'subscriptionType'
const PROPERTY_CHANGE_EVENT = 'contact.propertyChange'

// TODO: move to ENV
const PROTECTED_FILE_LINK_PROPERTY = 'file_sample'
const PUBLIC_FILE_LINK_PROPERTY = 'public_file_sample'

const utils = require('./utils')

const SIGNATURE_HEADER = 'X-HubSpot-Signature'

exports.getRouter = () => {
  router.post('/', async (req, res) => {
    const webhooksEvents = req.body
    console.log('Received hook events:')
    utils.logJson(webhooksEvents)

    try {
      for (const webhooksEvent of webhooksEvents) {
        const subscriptionType = _.get(webhooksEvent, SUBSCRIPTION_TYPE)
        const propertyName = _.get(webhooksEvent, PROPERTY_NAME)
        if (
          subscriptionType === PROPERTY_CHANGE_EVENT &&
          propertyName === PROTECTED_FILE_LINK_PROPERTY
        ) {
          const fileURL = _.get(webhooksEvent, PROPERTY_VALUE)
          const response = await req.hubspot.forms.getUploadedFileByUrl(fileURL)
          utils.logJson(response)
        }
      }
    } catch (e) {
      console.log(e)
    }

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

    throw new Error(
      'Unauthorized webhook event or error with request processing!'
    )
  }
}
