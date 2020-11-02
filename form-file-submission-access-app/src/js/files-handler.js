const debug = require('debug')('filesubmit:files')

const _ = require('lodash')
const utils = require('./utils')

const OBJECT_ID = 'objectId'
const PROPERTY_NAME = 'propertyName'
const PROPERTY_VALUE = 'propertyValue'
const SUBSCRIPTION_TYPE = 'subscriptionType'
const PROPERTY_CHANGE_EVENT = 'contact.propertyChange'

const UPLOAD_RESULT_URL_PROPERTY = 'friendly_url'
const PUBLIC_FILE_LINK_PROPERTY = process.env.PUBLIC_FILE_LINK_PROPERTY
const PROTECTED_FILE_LINK_PROPERTY = process.env.PROTECTED_FILE_LINK_PROPERTY

module.exports = async (hubspot, webhooksEvents) => {
  try {
    // File Upload Flow:

    // Step 1: Iterate over events
    for (const webhooksEvent of webhooksEvents) {
      const subscriptionType = _.get(webhooksEvent, SUBSCRIPTION_TYPE)
      const propertyName = _.get(webhooksEvent, PROPERTY_NAME)

      // Step 2: Check if event triggered by the file submission
      if (subscriptionType === PROPERTY_CHANGE_EVENT && propertyName === PROTECTED_FILE_LINK_PROPERTY) {
        const contactId = _.get(webhooksEvent, OBJECT_ID)
        const fileUrl = _.get(webhooksEvent, PROPERTY_VALUE)

        const fileData = { url: fileUrl, options: {
          access: 'PUBLIC_INDEXABLE',
          ttl: 'P3M',
          overwrite: false,
          duplicateValidationStrategy: 'NONE',
          duplicateValidationScope: 'ENTIRE_PORTAL'
      },fileName: utils.uuidv4(),
      folderPath: '/', folderId: null, charsetHunch: null }
        // Step 3: Upload file to public file storage

        // Upload a new file
        // POST /filemanager/api/v3/files
        // https://developers.hubspot.com/docs/methods/files/post_files
        const publicFile = await hubspot.files.uploadByUrl(fileData)
        const publicUrl = _.get(publicFile, `objects[0].${UPLOAD_RESULT_URL_PROPERTY}`)

        const updatePayload = {
          properties: [{ property: PUBLIC_FILE_LINK_PROPERTY, value: publicUrl }],
        }

        debug('contact ID: %s', contactId, updatePayload)

        // Step 4: Update contact with public file link

        // Update an existing contact
        // POST /contacts/v1/contact/vid/:vid/profile
        // https://developers.hubspot.com/docs/methods/contacts/update_contact
        await hubspot.contacts.update(contactId, updatePayload)

        return true
      }
    }
  } catch (e) {
    debug(e)
  }
  return false
}
