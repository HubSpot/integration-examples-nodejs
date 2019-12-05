require('dotenv').config({ path: '.env' })
const debug = require('debug')('file_upload:index')

const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const express = require('express')
const Hubspot = require('hubspot')
const formidable = require('formidable')
// const bodyParser = require('body-parser')

const PORT = 3000

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET
const SCOPES = 'contacts'
const REDIRECT_URI = `http://localhost:${PORT}/oauth-callback`
const UPLOAD_RESULT_URL_PROPERTY = 'friendly_url'

let fileByUrl
let fileFromComputer

let tokenStore = {}

const checkEnv = (req, res, next) => {
  if (_.startsWith(req.url, '/error')) return next()

  if (_.isNil(CLIENT_ID)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_ID env variable to proceed')
  if (_.isNil(CLIENT_SECRET)) return res.redirect('/error?msg=Please set HUBSPOT_CLIENT_SECRET env variable to proceed')

  next()
}

const isAuthorized = () => {
  return !_.isEmpty(tokenStore.refresh_token)
}

const isTokenExpired = () => {
  return Date.now() >= tokenStore.updated_at + tokenStore.expires_in * 1000
}

const fileToBuffer = (file) => {
  return new Promise((resolve, reject) => {
    fs.readFile(file.path, (err, data) => {
      if (err) return reject(err)

      resolve(data)
    })
  })
}

const refreshToken = async () => {
  hubspot = new Hubspot({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
    scopes: SCOPES,
    refreshToken: tokenStore.refresh_token,
  })

  tokenStore = await hubspot.refreshAccessToken()
  tokenStore.updated_at = Date.now()
  debug('Updated tokens', tokenStore)
}

const app = express()

let hubspot = new Hubspot({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri: REDIRECT_URI,
  scopes: SCOPES,
})

app.use(express.static('public'))
app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))

app.use((req, res, next) => {
  debug(req.method, req.url)
  next()
})

app.use(checkEnv)

app.get('/', async (req, res) => {
  try {
    if (!isAuthorized()) return res.render('login')
    if (isTokenExpired()) await refreshToken()
    res.render('dashboard', { fileByUrl: fileByUrl || '', fileFromComputer: fileFromComputer })
  } catch (e) {
    console.error(e)
    res.redirect(`/error?msg=${e.message}`)
  }
})

app.use('/oauth', async (req, res) => {
  const authorizationUrlParams = {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scopes: SCOPES,
  }

  // Use the client to get authorization Url
  // https://www.npmjs.com/package/hubspot
  debug('Creating authorization Url')
  const authorizationUrl = hubspot.oauth.getAuthorizationUrl(authorizationUrlParams)
  debug('Authorization Url', authorizationUrl)

  res.redirect(authorizationUrl)
})

app.use('/oauth-callback', async (req, res) => {
  const code = _.get(req, 'query.code')

  // Get OAuth 2.0 Access Token and Refresh Tokens
  // POST /oauth/v1/token
  // https://developers.hubspot.com/docs/methods/oauth2/get-access-and-refresh-tokens
  debug('Retrieving access token by code:', code)
  tokenStore = await hubspot.oauth.getAccessToken({ code })
  debug('Retrieving access token result:', tokenStore)
  tokenStore.updated_at = Date.now()

  // Set token for the
  // https://www.npmjs.com/package/hubspot
  hubspot.setAccessToken(tokenStore.access_token)
  res.redirect('/')
})

app.get('/login', (req, res) => {
  tokenStore = {}
  fileByUrl = null
  fileFromComputer = null

  res.redirect('/')
})

app.get('/reset', (req, res) => {
  fileByUrl = null
  fileFromComputer = null

  res.redirect('/')
})

app.get('/upload', async (req, res) => {
  const url = _.get(req, 'query.url')

  if (url) {
    debug('uploading file by URL ', url)
    const uploadingResult = await hubspot.files.uploadByUrl({ url, name: `${Date.now()}` })
    fileByUrl = _.get(uploadingResult, `objects[0].${UPLOAD_RESULT_URL_PROPERTY}`)
  }
  res.redirect('/')
})

app.post('/upload', async (req, res) => {
  try {
    new formidable.IncomingForm().parse(req, async (err, fields, files) => {
      if (err) throw err

      const name = _.get(files, 'content.name')
      debug('uploading file from computer', name)

      const content = await fileToBuffer(files.content)
      const uploadingResult = await hubspot.files.upload({ content, name })
      fileFromComputer = _.get(uploadingResult, `objects[0].${UPLOAD_RESULT_URL_PROPERTY}`)

      res.redirect('/')
    })
  } catch (e) {
    debug(e)
  }
})

app.get('/error', (req, res) => {
  res.render('error', { error: req.query.msg })
})

app.use((error, req, res, next) => {
  res.render('error', { error: error.message })
})

app.listen(PORT, () => debug(`Listening on http://localhost:${PORT}`))
