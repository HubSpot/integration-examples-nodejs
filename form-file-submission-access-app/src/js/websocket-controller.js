const WebSocketServer = require('websocket').server
let wsServer = null
let connection = null

exports.init = (server) => {
  wsServer = new WebSocketServer({
    httpServer: server,
  })

  wsServer.on('request', (request) => {
    console.log('received socket request')
    connection = request.accept(null, request.origin)
    connection.on('message', (message) => {
      if (message.type === 'utf8') {
        console.log('websocket', message)
      }
    })

    connection.on('close', (connection) => {
      console.log('websocket closed')
    })
  })
}

exports.update = () => {
  if (connection) connection.sendUTF('update')
}
