;(() => {
  const connection = new WebSocket(`wss://${location.host}`)

  connection.onopen = () => {
    console.log('connection opened')
  }

  connection.onerror = (error) => {
    console.log('connection error', error)
  }

  connection.onmessage = (message) => {
    console.log(message)
    location.reload()
  }
})()
