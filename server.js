const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/favicon.ico', (req, res) => res.status(204).end()); // Suppress favicon 404

// Store room data
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (room) => {
    socket.join(room);
    
    // Initialize room if it doesn't exist
    if (!rooms[room]) {
      rooms[room] = { users: [] };
    }
    
    // Add user to room
    if (!rooms[room].users.includes(socket.id)) {
      rooms[room].users.push(socket.id);
    }
    
    // Notify the joining user about existing users
    socket.emit('room-joined', rooms[room].users);
    
    // Notify others about the new user
    socket.to(room).emit('user-connected', socket.id);
    
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove user from room
      if (rooms[room]) {
        rooms[room].users = rooms[room].users.filter(id => id !== socket.id);
        
        // Delete room if empty
        if (rooms[room].users.length === 0) {
          delete rooms[room];
        }
      }
      
      socket.to(room).emit('user-disconnected', socket.id);
    });
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    
    // Remove user from room
    if (rooms[room]) {
      rooms[room].users = rooms[room].users.filter(id => id !== socket.id);
      
      // Delete room if empty
      if (rooms[room].users.length === 0) {
        delete rooms[room];
      }
    }
    
    socket.to(room).emit('user-disconnected', socket.id);
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

  socket.on('chat-message', ({ room, message, userId }) => {
    socket.to(room).emit('chat-message', { 
      message, 
      userId,
      userName: `User ${userId.substring(0, 6)}`
    });
  });

  socket.on('user-media-update', ({ room, userId, video, audio }) => {
    socket.to(room).emit('user-media-update', { userId, video, audio });
  });

  socket.on('user-connected', ({ to, room, from }) => {
    socket.to(to).emit('user-connected', from);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Signaling server running on port', process.env.PORT || 3000);
});
