const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =========================
  // JOIN ROOM
  // =========================

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);

    console.log(socket.id + " joined room: " + roomId);
  });

  // =========================
  // CHAT MESSAGE
  // =========================

  socket.on("message", ({ roomId, message }) => {
    console.log("Message received:", message, "Room:", roomId);

    io.to(roomId).emit("message", message);
  });

  // =========================
  // VIDEO PLAY
  // =========================

  socket.on("video:play", ({ roomId, currentTime }) => {
    console.log("Video Play:", roomId, currentTime);

    socket.to(roomId).emit("video:play", {
      currentTime,
    });
  });

  // =========================
  // VIDEO PAUSE
  // =========================

  socket.on("video:pause", ({ roomId, currentTime }) => {
    console.log("Video Pause:", roomId, currentTime);

    socket.to(roomId).emit("video:pause", {
      currentTime,
    });
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});
