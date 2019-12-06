# HubSpot-nodejs file upload sample

This is a sample app for the [node-hubspot wrapper](https://www.npmjs.com/package/hubspot). Currently, this app focuses on file upload functionality

  - [Using OAuth 2.0 access tokens](https://developers.hubspot.com/docs/methods/oauth2/get-access-and-refresh-tokens)
  - [Upload a new file API](https://developers.hubspot.com/docs/methods/files/post_files)
  - [Wrapper methods](https://github.com/MadKudu/node-hubspot#files)

Please see the documentation on [How do I create an app in HubSpot?](https://developers.hubspot.com/docs/faq/how-do-i-create-an-app-in-hubspot)

This application demonstrates the use of [uploadByUrl method of SDK](https://github.com/MadKudu/node-hubspot/blob/eeaddcd74274468d576f0365d9417d5db0d845fa/lib/file.js#L52)

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
