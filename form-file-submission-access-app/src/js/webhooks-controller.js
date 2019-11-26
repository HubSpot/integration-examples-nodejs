const debug = require('debug')('filesubmit:webhooks')

const _ = require('lodash')
const crypto = require('crypto')
const express = require('express')

const utils = require('./utils')
const websocketController = require('./websocket-controller')
const router = new express.Router()

const OBJECT_ID = 'objectId'
const PROPERTY_NAME = 'propertyName'
const PROPERTY_VALUE = 'propertyValue'
const SUBSCRIPTION_TYPE = 'subscriptionType'
const PROPERTY_CHANGE_EVENT = 'contact.propertyChange'

const UPLOAD_RESULT_URL_PROPERTY = 'friendly_url'
const PROTECTED_FILE_LINK_PROPERTY = 'file_sample'
const PUBLIC_FILE_LINK_PROPERTY = 'public_file_sample'

const SIGNATURE_HEADER = 'X-HubSpot-Signature'

exports.getRouter = () => {
  router.post('/', async (req, res) => {
    const webhooksEvents = req.body
    debug('receive events: %O', webhooksEvents)

    try {
      // APP Flow:

      // Step 1: Receive webhook events
      for (const webhooksEvent of webhooksEvents) {
        const subscriptionType = _.get(webhooksEvent, SUBSCRIPTION_TYPE)
        const propertyName = _.get(webhooksEvent, PROPERTY_NAME)

        // Step 2: Check if event triggered by the file submission
        if (subscriptionType === PROPERTY_CHANGE_EVENT && propertyName === PROTECTED_FILE_LINK_PROPERTY) {
          const contactId = _.get(webhooksEvent, OBJECT_ID)
          const fileUrl = _.get(webhooksEvent, PROPERTY_VALUE)
          const fileUploadOptions = { url: fileUrl, name: utils.uuidv4() }

          // Step 3: Upload file to public file storage

          // Upload a new file
          // POST /filemanager/api/v2/files
          // https://developers.hubspot.com/docs/methods/files/post_files
          const publicFile = await req.hubspot.files.upload(fileUploadOptions)
          const publicUrl = _.get(publicFile, `objects[0].${UPLOAD_RESULT_URL_PROPERTY}`)

          const updatePayload = {
            properties: [{ property: PUBLIC_FILE_LINK_PROPERTY, value: publicUrl }],
          }

          debug('contact ID: %s', contactId)
          debug(updatePayload)

          // Step 4: Update contact with public file link

          // Update an existing contact
          // POST /contacts/v1/contact/vid/:vid/profile
          // https://developers.hubspot.com/docs/methods/contacts/update_contact
          await req.hubspot.contacts.update(contactId, updatePayload)
          websocketController.update()
        }
      }
    } catch (e) {
      debug(e)
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
      debug(e)
    }

    throw new Error('Unauthorized webhook event or error with request processing!')
  }
}
