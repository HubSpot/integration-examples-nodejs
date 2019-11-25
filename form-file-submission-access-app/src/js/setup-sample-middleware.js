const _ = require('lodash')

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

module.exports = async (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next()
  if (_.startsWith(req.url, '/login')) return next()
  if (_.startsWith(req.url, '/auth')) return next()

  if (!initialized) {
    const fileSamplePropertyPayload = _.assign({}, propertyProto, {
      name: PROTECTED_FILE_LINK_PROPERTY,
      label: PROTECTED_FILE_LINK_PROPERTY,
    })

    const publicFileSamplePropertyPayload = _.assign({}, propertyProto, {
      name: PUBLIC_FILE_LINK_PROPERTY,
      label: PUBLIC_FILE_LINK_PROPERTY,
    })

    await req.hubspot.contacts.properties.upsert(fileSamplePropertyPayload)
    await req.hubspot.contacts.properties.upsert(publicFileSamplePropertyPayload)
    initialized = true
  }
  return next()
}
