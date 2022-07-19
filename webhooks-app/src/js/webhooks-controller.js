const _ = require('lodash');
const crypto = require('crypto');
const express = require('express');
const router = new express.Router();
const dbHelper = require('./db-helper');

const utils = require('./utils');
const kafkaHelper = require('./kafka-helper');

const SIGNATURE_HEADER = 'X-HubSpot-Signature';

createDealForContactCreation = async (contactCreationEvent, hubspot) => {
  try {
    console.log(`contactCreationEvent:`, contactCreationEvent);
    // console.log(`hubspot:`, hubspot);

    const contactId = _.get(contactCreationEvent, 'objectId');
    console.log(`contact ID:`, contactId);

    const contact = await hubspot.contacts.getById(contactId);

    console.log(`contact:`, contact);
    return contact;
  } catch (error) {
    // console.error(error);
    return null;
  }
}

createDealFromContact = async (contact, hubspot) => {
  console.log(`contact:`, contact);

  // HubSpot API経由で得られるContactオブジェクトは以下のような形になる。
  // { vid: 751,
  //   'canonical-vid': 751,
  //   'merged-vids': [],
  //   'portal-id': 22327222,
  //   'is-contact': true,
  //   properties: {
  //     hs_is_unworked: { value: 'true', versions: [Array] },
  //     firstname: { value: 'やま', versions: [Array] },
  //     lastmodifieddate: { value: '1658215157097', versions: [Array] },
  //     num_unique_conversion_events: { value: '0', versions: [Array] },
  //     hs_pipeline: { value: 'contacts-lifecycle-pipeline', versions: [Array] },
  //     createdate: { value: '1658215156205', versions: [Array] },
  //     hs_lifecyclestage_subscriber_date: { value: '1658215156188', versions: [Array] },
  //     lastname: { value: 'むら', versions: [Array] },
  //     hs_all_contact_vids: { value: '751', versions: [Array] },
  //     hs_sequences_actively_enrolled_count: { value: '0', versions: [Array] },
  //     hs_marketable_until_renewal: { value: 'false', versions: [Array]
  //   },
  //   hs_marketable_status: { value: 'false', versions: [Array] },
  //   hubspot_owner_id: { value: '204267630', versions: [Array] },
  //   hubspot_owner_assigneddate: { value: '1658215156188', versions: [Array] },
  //   hs_is_contact: { value: 'true', versions: [Array] },
  //   num_conversion_events: { value: '0', versions: [Array] },
  //   hs_created_by_user_id: { value: '45854322', versions: [Array] },
  //   hs_object_id: { value: '751', versions: [Array] },
  //   hs_email_domain: { value: 'neumann.tokyo', versions: [Array] },
  //   lifecyclestage: { value: 'subscriber', versions: [Array] },
  //   hs_count_is_worked: { value: '0', versions: [Array] },
  //   email: { value: 's_murayama@neumann.tokyo', versions: [Array] },
  //   hs_count_is_unworked: { value: '1', versions: [Array] } },
  //   'form-submissions': [],
  //   'list-memberships': [],
  //   'identity-profiles': [
  //     {
  //       vid: 751,
  //       'saved-at-timestamp': 1658215156338,
  //       'deleted-changed-timestamp': 0,
  //       identities: [Array]
  //     }
  //   ],
  //   'merge-audits': []
  // }

  // 取引(deal)のデータについては、以下のページに基本形がある。
  // https://legacydocs.hubspot.com/docs/methods/deals/create_deal
  const dealData = {
    "associations": {
      "associatedVids": [_.get(contact, 'vid')]
    },
    "properties": [
      {
        "name": "dealname",
        "value": `${_.get(contact, ['properties', 'lastname', 'value'], '')}` + ' ' + `${_.get(contact, ['properties', 'firstname', 'value'], '')}` + ' 様のご契約'
      }
    ]
  };

  const result = await hubspot.deals.create(dealData);
  console.log(`deal creation result:`, result);
  return result;
}

exports.getRouter = () => {
  router.post('/', async (req, res) => {
    const events = req.body;

    console.log('Received hook events:');

    utils.logJson(events);
    // await kafkaHelper.send(events);

    // **Age Technologies追加部分**
    // Kafka経由でメッセージを送信してしまうと、HubSpotへのアクセスを行う`req.hubspot`オブジェクトを渡せないので、
    // ここで処理する。

    // eventsは、Objectの配列。
    // 各Objectの詳細は https://developers.hubspot.jp/docs/api/webhooks の「サブスクリプションフィールド」以下の項を参照のこと。
    // events: [
    //   { eventId: 3467258695,
    //     subscriptionId: 1672026,
    //     portalId: 22327222,
    //     appId: 984046,
    //     occurredAt: 1658196190598,
    //     subscriptionType: 'contact.creation',
    //     attemptNumber: 0,
    //     objectId: 451,
    //     changeFlag: 'NEW',
    //     changeSource: 'CONTACTS' } ]
    //

    // 「コンタクトの生成」イベントのみを抜き出す
    const contactCreationEvents = events.filter(e => e.subscriptionType == 'contact.creation');
    console.log(`target events:`, contactCreationEvents);
    const contacts = contactCreationEvents.map(async (e) => {
      try {
        const contact = await createDealForContactCreation(e, req.hubspot);
        if (contact) {
          const deal = await createDealFromContact(contact, req.hubspot);
          return deal;
        } else {
          return null;
        }
      } catch (error) {
        console.error('error.');
        return null;
      }
    });

    res.sendStatus(200);
  });

  router.get('/new', async (req, res) => {
    const notShownEventsCount = await dbHelper.getNewEventsCount();
    res.status(200).jsonp({notShownEventsCount});
  });

  return router;
};

exports.getWebhookVerification = () => {
  return (req, res, buf, encoding) => {
    try {
      if (req.originalUrl === '/webhooks') {
        const rawBody = buf.toString(encoding);
        const signature = req.header(SIGNATURE_HEADER);

        const secret = process.env.HUBSPOT_CLIENT_SECRET;
        const hash = crypto.createHash('sha256').update(secret + rawBody).digest('hex');

        if (signature === hash) return;
      }
    } catch (e) {
      console.log(e);
    }

    throw new Error('Unauthorized webhook or error with request processing!');
  };
};
