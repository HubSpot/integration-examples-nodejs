const debug = require('debug')('filesubmit:setup')

const _ = require('lodash')

const SAMPLE_FILE_SUBMIT_FORM_NAME = 'sample_file_submit_form_name'
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

const createProperty = (hubspot, propertyName) => {
  debug('create property %s', propertyName)
  const propertyPayload = _.assign({}, propertyProto, {
    name: propertyName,
    label: propertyName,
  })
  return hubspot.contacts.properties.upsert(propertyPayload)
}

const createForm = async (req, protectedPropertyName) => {
  const formsResponse = await req.hubspot.forms.getAll()
  const form = _.find(formsResponse, { name: SAMPLE_FILE_SUBMIT_FORM_NAME })
  if (form) return

  const formPayload = {
    name: SAMPLE_FILE_SUBMIT_FORM_NAME,
    redirect: req.hostUrl,
    submitText: 'Submit',
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
      await createProperty(req.hubspot, PROTECTED_FILE_LINK_PROPERTY)
      await createProperty(req.hubspot, PUBLIC_FILE_LINK_PROPERTY)

      debug('setup form')
      await createForm(req, PROTECTED_FILE_LINK_PROPERTY)
      initialized = true
    } catch (e) {
      debug(e)
    }
  }
  return next()
}
