const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const emailToSocketIdMap = new Map();
const socketIdtoEmailMap = new Map();

io.on("connection", (socket) => {
  console.log("User Connection ID : ", socket.id);

  socket.on("join-room", (userData) => {
    const { email, roomNo } = userData;
    if (!email || !roomNo) {
      return socket.emit("error", "Email and room number are required.");
    }
    if (emailToSocketIdMap.has(email)) {
      return socket.emit("error", "User already in a room.");
    }
    emailToSocketIdMap.set(email, socket.id);
    socketIdtoEmailMap.set(socket.id, email);
    socket.join(roomNo);
    socket.broadcast.to(roomNo).emit("user-joined", { email, id: socket.id });
    socket.emit("room-joined", userData);
  });

  socket.on("leave-room", () => {
    const email = socketIdtoEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
      socketIdtoEmailMap.delete(socket.id);
    }
    socket.leaveAll();
    socket.emit("room-left");
  });

  socket.on("end-call", ({ to }) => {
    const email = socketIdtoEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
      socketIdtoEmailMap.delete(socket.id);
    }
    socket.leaveAll();
    io.to(to).emit("call-ended");
  });

  socket.on("offer-call", ({ to, offer }) => {
    io.to(to).emit("incoming-call", { from: socket.id, offer: offer });
  });

  socket.on("answer-call", ({ to, answer }) => {
    io.to(to).emit("call-accepted", { from: socket.id, answer: answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-response", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected - ", socket.id);
    const email = socketIdtoEmailMap.get(socket.id);
    if (email) {
      emailToSocketIdMap.delete(email);
      socketIdtoEmailMap.delete(socket.id);
    }
  });
});

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "API running at PORT 3000",
  });
});

server.listen(3000, () => {
  console.log(`Server is listening at PORT 3000`);
});
