;(() => {
  const connection = new WebSocket(`wss://${location.host}`)

  connection.onopen = () => {
    console.log('connection opened', location.href)
  }

  connection.onerror = (error) => {
    console.log('connection error', error)
    connection.close()
  }

  connection.onmessage = (message) => {
    console.log(message)
    connection.close()
    history.go()
  }
})()
