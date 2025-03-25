const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'update') wss.clients.forEach(client => client.send(JSON.stringify(data)));
  });
});