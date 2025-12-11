const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket']
});
const { ExpressPeerServer } = require('peer');
const path = require('path');
const fs = require('fs');

const PORT = 3000;

// Global State
const roomUsers = {};           // { roomId: { peerId: "Nickname" } }
const roomScreenShares = {};    // { roomId: peerId } -- Single Sharer Tracker
const roomVotes = {};           // { roomId: { targetId, targetName, yes, no, voters: Set(), timer, active: bool } }
const roomCooldowns = {};       // { roomId: timestamp }
const bannedIPs = {};           // { ip: expireTimestamp }
const socketMap = {};           // { socketId: { roomId, peerId } } -- Critical for Ghost User Fix

// Helper: Robust IP Detection
function getClientIP(socket) {
  try {
    const headers = socket.handshake.headers || {};
    let ip = headers['cf-connecting-ip'] || headers['x-forwarded-for'] || socket.handshake.address;

    // Handle x-forwarded-for list
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }

    // Handle IPv6 localhost
    if (ip === '::1') return '127.0.0.1';

    // Handle IPv4 mapped IPv6 (e.g., ::ffff:192.168.1.1)
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substr(7);
    }

    return ip || '0.0.0.0';
  } catch (e) {
    console.error("Failed to detect IP:", e);
    return '0.0.0.0';
  }
}

// Load Rooms Config
let rooms = [];
function loadRooms() {
  try {
    const data = fs.readFileSync('./config/rooms.json', 'utf8');
    rooms = JSON.parse(data);
    console.log("Loaded Rooms:", rooms.map(r => r.name));
  } catch (err) {
    console.error("Error loading rooms.json:", err);
    rooms = [{ id: 'lobby', name: 'Lobby (Yedek)', password: null }];
  }
}
loadRooms();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// PeerJS Server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  allow_discovery: true
});

app.use('/peerjs', peerServer);

// API: Get Rooms
app.get('/rooms', (req, res) => {
  loadRooms();
  const sanitizedRooms = rooms.map(r => ({
    id: r.id,
    name: r.name,
    isLocked: !!r.password
  }));
  res.json(sanitizedRooms);
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Socket.io Logic
io.on('connection', socket => {

  // 1. IP Detection & Debug Log
  const ip = getClientIP(socket);
  console.log(`New Connection: Socket ID ${socket.id} - IP: ${ip}`);

  // 2. Ban Check (Immediate)
  if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
    const timeLeft = Math.ceil((bannedIPs[ip] - Date.now()) / 60000);
    console.log(`Blocked Banned Connection from: ${ip}`);

    // Emit error then disconnect
    socket.emit('error', `Bu odadan uzaklaştırıldınız. ${timeLeft} dakika sonra tekrar deneyin.`);
    setTimeout(() => socket.disconnect(true), 1000); // Give 1s to receive message
    return;
  }

  socket.on('join-room', ({ roomId, peerId, nickname, password }) => {

    // Double Check Ban (Just in case)
    if (bannedIPs[ip] && Date.now() < bannedIPs[ip]) {
      socket.disconnect(true);
      return;
    }

    const room = rooms.find(r => r.id === roomId);

    if (!room) {
      socket.emit('error', 'Oda bulunamadı');
      return;
    }
    if (room.password && room.password !== password) {
      socket.emit('error', 'Geçersiz Şifre');
      return;
    }

    console.log(`[Socket] User ${nickname} joining ${roomId}`);
    socket.join(roomId);
    socket.peerId = peerId; // STORE PEER ID ON SOCKET FOR BAN LOGIC

    // TRACK SOCKET
    socketMap[socket.id] = { roomId, peerId };

    // Track User
    if (!roomUsers[roomId]) roomUsers[roomId] = {};

    // --- UNIQUE NAME LOGIC ---
    let safeName = nickname;
    const existingNames = Object.values(roomUsers[roomId]);
    while (existingNames.includes(safeName)) {
      safeName = `${nickname}_${Math.floor(Math.random() * 1000)}`;
    }
    // Update the local variable so chat uses the new name
    nickname = safeName;

    roomUsers[roomId][peerId] = safeName;

    // Send existing users to new joiner
    socket.emit('existing-users', roomUsers[roomId]);

    // Broadcast to others
    socket.to(roomId).emit('user-connected', peerId, safeName);

    // Confirm join (Send back cleaned name)
    socket.emit('joined-room', { roomId, nickname: safeName });

    // If someone is already sharing, tell the new user
    if (roomScreenShares[roomId]) {
      socket.emit('share-started', roomScreenShares[roomId]);
    }

    // Chat Handler
    socket.on('chat-message', (msg) => {
      const cleanMsg = String(msg).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      io.to(roomId).emit('chat-message', {
        user: nickname,
        text: cleanMsg,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      });
    });

    // --- Screen Share Lock Logic ---
    socket.on('request-share', () => {
      const currentSharer = roomScreenShares[roomId];
      if (currentSharer && currentSharer !== peerId) {
        // Someone else is sharing
        socket.emit('share-denied');
      } else {
        // Available or already me
        roomScreenShares[roomId] = peerId;
        socket.emit('share-approved');
        io.to(roomId).emit('share-started', peerId);
      }
    });

    socket.on('stop-share', () => {
      if (roomScreenShares[roomId] === peerId) {
        delete roomScreenShares[roomId];
        io.to(roomId).emit('share-ended');
      }
    });

    // --- Vote Kick Logic V2 ---
    socket.on('start-vote', (targetId) => {
      // Validation
      if (roomCooldowns[roomId] && Date.now() < roomCooldowns[roomId]) {
        const timeLeft = Math.ceil((roomCooldowns[roomId] - Date.now()) / 1000);
        return socket.emit('error', `Oylama için ${timeLeft}sn beklemelisiniz.`);
      }
      if (roomVotes[roomId] && roomVotes[roomId].active) {
        return socket.emit('error', 'Şu an devam eden bir oylama var.');
      }

      const targetName = roomUsers[roomId][targetId] || "Kullanıcı";

      // Init Vote (Target Auto-No)
      roomVotes[roomId] = {
        targetId,
        targetName,
        yes: 0,
        no: 1, // Target votes NO automatically
        voters: new Set(),
        active: true
      };

      io.to(roomId).emit('vote-started', { targetName, targetId });

      // Vote Timer (30s)
      setTimeout(() => {
        endVote(roomId);
      }, 30000);
    });

    socket.on('submit-vote', (vote) => { // vote: true (yes) or false (no)
      const currentVote = roomVotes[roomId];
      if (!currentVote || !currentVote.active) return;

      // Target cannot vote manually (already counted as NO)
      if (peerId === currentVote.targetId) return;

      if (currentVote.voters.has(peerId)) return; // Already voted

      currentVote.voters.add(peerId);
      if (vote) currentVote.yes++;
      else currentVote.no++;
    });

    socket.on('disconnect', () => {
      const info = socketMap[socket.id];
      if (info) {
        const { roomId, peerId } = info;

        // Cleanup User
        if (roomUsers[roomId]) delete roomUsers[roomId][peerId];

        // Check Screen Share
        if (roomScreenShares[roomId] === peerId) {
          delete roomScreenShares[roomId];
          io.to(roomId).emit('share-ended');
        }

        // Notify others
        socket.to(roomId).emit('user-disconnected', peerId);

        // Cleanup Map
        delete socketMap[socket.id];
      }
    });
  });
});

function endVote(roomId) {
  const v = roomVotes[roomId];
  if (!v || !v.active) return;

  v.active = false;
  roomCooldowns[roomId] = Date.now() + 60000; // 1 min cooldown

  console.log(`Vote Result for Room ${roomId}: Yes:${v.yes} No:${v.no}`);

  // Notify Frontend to close modals
  io.to(roomId).emit('vote-ended', {});

  // Rule: Yes > No
  if (v.yes > v.no) {
    io.to(roomId).emit('chat-message', {
      user: "Sistem",
      text: `⚠️ **${v.targetName}** oy çoğunluğu ile uzaklaştırıldı.`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    });

    io.to(roomId).emit('kick-user', v.targetId);

    // --- BAN LOGIC IMPLEMENTATION ---

    // Find Target Socket to get IP
    // We know v.targetId is the PeerID.
    // But SocketIO doesn't map PeerID -> Socket natively.
    // We need to find the socket that joined with this PeerID in this room.
    // Since we didn't store PeerID -> SocketID, we have to iterate sockets.
    // Efficient enough for small rooms.

    io.sockets.sockets.forEach((s) => {
      // We need to know if 's' is the target.
      // But we didn't store peerID on the socket object explicitly in 'roomUsers' map logic above.
      // Oh, wait, we don't attach peerId to socket in join-room.
      // Let's rely on roomUsers state or just iterate.

      // Actually, we can't easily identify the socket unless we tagged it.
      // BUT, we can't modify 'io.on' logic inside 'endVote'.
      // FIX: We need to modify 'join-room' to attach peerId to the socket object.
      // Checking above... 'join-room' has 'peerId'. 
      // We can add `socket.peerId = peerId` in `join-room`.
    });

    // RE-CHECKING `join-room` above... I didn't add `socket.peerId = peerId`.
    // I will fix this NOW by adding it to the `join-room` handler in the code I am generating.
    // See below.

    const targetSocket = Array.from(io.sockets.sockets.values()).find(s => s.peerId === v.targetId);

    if (targetSocket) {
      const targetIP = getClientIP(targetSocket);
      bannedIPs[targetIP] = Date.now() + (5 * 60 * 1000); // 5 min
      console.log(`Banning IP: ${targetIP} for User: ${v.targetName}`);

      // Disconnect them immediately (kick-user event is polite, this is force)
      targetSocket.emit('error', 'Oylama sonucu odadan atıldınız.');
      setTimeout(() => targetSocket.disconnect(true), 200);
    } else {
      console.log("Could not find target socket to ban IP. User might have disconnected already.");
    }

  } else {
    io.to(roomId).emit('chat-message', {
      user: "Sistem",
      text: `ℹ️ Oylama başarısız. ${v.targetName} kalıyor. (Evet: ${v.yes}, Hayır: ${v.no})`,
      time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    });
  }

  delete roomVotes[roomId];
}

// BIND to 0.0.0.0 for Docker
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// IMPORTANT: Updated join-room to store peerId on socket for finding it later!
// Find the io.on block above and see the tweak.
