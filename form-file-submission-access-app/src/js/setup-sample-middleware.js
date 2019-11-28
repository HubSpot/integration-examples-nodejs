const debug = require('debug')('filesubmit:setup')

const _ = require('lodash')
const contactsController = require('./contacts-controller')

const SAMPLE_FILE_SUBMIT_FORM_NAME = 'sample_file_submit_form'
const PROTECTED_FILE_LINK_PROPERTY = 'file_sample'
const PUBLIC_FILE_LINK_PROPERTY = 'public_file_sample'

const propertyProto = {
  description: 'HubSpot sample Form Submission and File Download app use this field for uploading picture',
  groupName: 'contactinformation',
  type: 'string',
  formField: true,
  fieldType: 'file',
}

let initialized = false

const initProperty = (hubspot, propertyName) => {
  debug('init property %s', propertyName)
  const propertyPayload = _.assign({}, propertyProto, {
    name: propertyName,
    label: propertyName,
  })

  // Update a contact property
  // PUT /properties/v1/contacts/properties/named/:property_name
  // https://developers.hubspot.com/docs/methods/contacts/v2/update_contact_property
  return hubspot.contacts.properties.upsert(propertyPayload)
}

const initForm = async (req, protectedPropertyName) => {
  // Get all forms from a portal
  // GET /forms/v2/forms
  // https://developers.hubspot.com/docs/methods/forms/v2/get_forms
  const formsResponse = await req.hubspot.forms.getAll()

  const form = _.find(formsResponse, { name: SAMPLE_FILE_SUBMIT_FORM_NAME })
  if (form) return form

  const formPayload = {
    name: SAMPLE_FILE_SUBMIT_FORM_NAME,
    submitText: 'SUBMIT',
    inlineMessage: '<p>Thanks for submitting the form</p>',
    formFieldGroups: [
      {
        fields: [
          {
            name: 'email',
            label: 'Contact Email',
            type: 'string',
            fieldType: 'text',
            required: true,
            enabled: true,
            hidden: false,
            placeholder: 'Email',
          },
        ],
        default: true,
        isSmartGroup: false,
      },
      {
        fields: [
          {
            name: protectedPropertyName,
            label: 'Protected File',
            type: 'string',
            fieldType: 'file',
            required: true,
            enabled: true,
            hidden: false,
            placeholder: protectedPropertyName,
          },
        ],
        default: true,
        isSmartGroup: false,
      },
    ],
  }

  // Create a new form
  // POST /forms/v2/forms
  // https://developers.hubspot.com/docs/methods/forms/v2/create_form
  return req.hubspot.forms.create(formPayload)
}

module.exports = async (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next()
  if (_.startsWith(req.url, '/login')) return next()
  if (_.startsWith(req.url, '/auth')) return next()

  if (!initialized) {
    try {
      debug('setup app')

      debug('setup properties')
      await initProperty(req.hubspot, PROTECTED_FILE_LINK_PROPERTY)
      await initProperty(req.hubspot, PUBLIC_FILE_LINK_PROPERTY)

      debug('setup form')
      const formResponse = await initForm(req, PROTECTED_FILE_LINK_PROPERTY)
      contactsController.setFormIds({
        portalId: formResponse.portalId,
        formId: formResponse.guid,
      })
      initialized = true
    } catch (e) {
      debug(e)
    }
  }
  return next()
}
