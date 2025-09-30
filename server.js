const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Rest of your server.js code remains the same
io.on('connection', (socket) => {
  socket.on('join-room', (room) => {
    socket.join(room);
    socket.to(room).emit('user-connected', socket.id);

    socket.on('disconnect', () => {
      socket.to(room).emit('user-disconnected', socket.id);
    });
  });

  socket.on('offer', ({ offer, to, room }) => {
    socket.to(to).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, to, room }) => {
    socket.to(to).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, to, room }) => {
    socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Signaling server running on port', process.env.PORT || 3000);
});
