# HubSpot-nodejs companies sample app

This is a sample app for the [node-hubspot wrapper](https://www.npmjs.com/package/hubspot). Currently, this app focuses on demonstrating the functionality of [OAuth API](https://developers.hubspot.com/docs/methods/oauth2/oauth2-overview) endpoints and their related actions.

### HubSpot Public API links used in this application

  - [Create a Company]( https://developers.hubspot.com/docs/methods/companies/create_company)
  - [Update a Company]( https://developers.hubspot.com/docs/methods/companies/update_company)
  - [Search for companies by domain](https://developers.hubspot.com/docs/methods/companies/search_companies_by_domain)
  - [Get all companies](https://developers.hubspot.com/docs/methods/companies/get-all-companies)
  - [Get all Company Properties](https://developers.hubspot.com/docs/methods/companies/get_company_properties)
  - [Get a Company](https://developers.hubspot.com/docs/methods/companies/get_company)
  - [Get Contacts at a Company]( https://developers.hubspot.com/docs/methods/companies/get_company_contacts)
  - [Get all contacts](https://developers.hubspot.com/docs/methods/contacts/get_contacts)
  - [Search for contacts by email, name, or company name](https://developers.hubspot.com/docs/methods/contacts/search_contacts)
  - [Create multiple associations between CRM objects](https://developers.hubspot.com/docs/methods/crm-associations/batch-associate-objects)
  - [Delete multiple associations between CRM objects](https://developers.hubspot.com/docs/methods/crm-associations/batch-delete-associations)

### Setup App

Make sure you have [Docker](https://www.docker.com/) installed.
Make sure you have [Docker Compose](https://docs.docker.com/compose/) installed.

### Configure

1. Copy .env.template to .env
2. Paste your HubSpot Client Id and HubSpot Client Secret as the value for HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET in .env

### Running

The best way to run this project (with the least configuration), is using docker cli.

```bash
docker-compose up 
```
You should now be able to navigate to [http://localhost:3000](http://localhost:3000) and use the application.
