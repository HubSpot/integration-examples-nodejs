// const _ = require('lodash')
const express = require('express')
const router = new express.Router()

// const getFullName = (contact) => {
//   const firstName = _.get(contact, 'properties.firstname.value') || ''
//   const lastName = _.get(contact, 'properties.lastname.value') || ''
//   return `${firstName} ${lastName}`
// }

exports.getRouter = () => {
  router.get('/', async (req, res) => {
    try {
      // Get a batch of contacts by vid
      // GET /contacts/v1/contact/vids/batch/
      // https://developers.hubspot.com/docs/methods/contacts/get_batch_by_vid
      // const contactsResponse = await req.hubspot.contacts.getByIdBatch(
      //   contactIds
      // )
      // console.log(contactsResponse)
      //
      // const contacts = prepareContactsForView(events, contactsResponse)
      //
      res.render('contacts')
    } catch (e) {
      console.error(e)
      res.redirect(`/error?msg=${e.message}`)
    }
  })

  return router
}
