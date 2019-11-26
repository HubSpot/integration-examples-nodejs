const WebSocketServer = require('websocket').server
const debug = require('debug')('filesubmit:sockets')

let wsServer = null
let connection = null

exports.init = (server) => {
  wsServer = new WebSocketServer({
    httpServer: server,
  })

  wsServer.on('request', (request) => {
    debug('received request')
    connection = request.accept(null, request.origin)
    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        debug(message)
      }
    })

    connection.on('close', (connection) => {
      debug('closed')
    })
  })
}

exports.update = () => {
  if (connection) connection.sendUTF('update')
}
