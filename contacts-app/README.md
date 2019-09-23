# HubSpot-nodejs contacts sample app

This is a sample app for the [node-hubspot wrapper](https://www.npmjs.com/package/hubspot). Currently, this app focuses on demonstrating the functionality of [Contacts API](https://developers.hubspot.com/docs/methods/contacts/contacts-overview) endpoints and their related actions.

### Setup App

Make sure you have [Docker](https://www.docker.com/) installed.
Make sure you have [Docker Compose](https://docs.docker.com/compose/) installed.

### Configure

1. Copy .env.template to .env
2. Paste your HubSpot API Key as the value for HUBSPOT_API_KEY in .env

### Running

The best way to run this project (with the least configuration), is using docker cli.

```bash
docker-compose up 
```
You should now be able to navigate to [http://localhost:3000](http://localhost:3000) and use the application.
