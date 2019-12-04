const _ = require('lodash')
const WebSocketServer = require('websocket').server
const debug = require('debug')('filesubmit:sockets')

let wsServer = null
let connections = []

exports.init = (server) => {
  wsServer = new WebSocketServer({
    httpServer: server,
  })

  wsServer.on('request', (request) => {
    debug('received request')
    const connection = request.accept(null, request.origin)
    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        debug(message)
      }
    })

    connection.on('close', (e) => {
      debug('closed', e)
      connections = _.without(connections, connection)
    })
    connections.push(connection)
  })
}

exports.update = () => {
  debug('trigger update')
  debug('connections: ', connections.length)
  _.each(connections, (connection) => {
    try {
      connection && connection.sendUTF('update')
    } catch (e) {
      debug(e)
    }
  })
}
