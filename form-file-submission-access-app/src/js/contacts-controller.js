const debug = require('debug')('filesubmit:contacts')

const _ = require('lodash')
const express = require('express')
const router = new express.Router()

const PROTECTED_FILE_LINK_PROPERTY = 'file_sample'
const PUBLIC_FILE_LINK_PROPERTY = 'public_file_sample'

const REQUESTED_PROPERTIES = {
  property: ['email', 'firstname', 'lastname', PUBLIC_FILE_LINK_PROPERTY, PROTECTED_FILE_LINK_PROPERTY],
}

let formIds = {}

const getFullName = (contact) => {
  const firstName = _.get(contact, 'firstname.value') || ''
  const lastName = _.get(contact, 'lastname.value') || ''
  return `${firstName} ${lastName}`
}

const prepareContactsContent = (contacts) => {
  return _.map(contacts, (contact) => {
    const email = _.get(contact, `properties.email.value`) || ''
    const protectedLink = _.get(contact, `properties.${PROTECTED_FILE_LINK_PROPERTY}.value`) || ''
    const publicLink = _.get(contact, `properties.${PUBLIC_FILE_LINK_PROPERTY}.value`) || ''
    return { vid: contact.vid, email, name: getFullName(contact.properties), protectedLink, publicLink }
  })
}

exports.setFormIds = (ids) => {
  formIds = ids
}

exports.getRouter = () => {
  router.get('/', async (req, res) => {
    try {
      const search = _.get(req, 'query.search') || ''
      let contactsResponse = { contacts: [] }
      if (_.isNil(search)) {
        // TODO: update
        // Get all contacts
        // GET /contacts/v1/lists/all/contacts/all
        // https://developers.hubspot.com/docs/methods/contacts/get_contacts
        console.log('Calling contacts.get API method. Retrieve all contacts.')

        contactsResponse = await req.hubspot.contacts.getRecentlyModified(REQUESTED_PROPERTIES)
      } else {
        // Search for contacts by email, name, or company name
        // GET /contacts/v1/search/query
        // https://developers.hubspot.com/docs/methods/contacts/search_contacts
        contactsResponse = await req.hubspot.contacts.search(search, REQUESTED_PROPERTIES)
      }

      const contacts = prepareContactsContent(contactsResponse.contacts)
      res.render('contacts', { contacts: contacts, search, portalId: formIds.portalId, formId: formIds.formId })
    } catch (e) {
      debug(e)
      res.redirect(`/error?msg=${e.message}`)
    }
  })

  return router
}
