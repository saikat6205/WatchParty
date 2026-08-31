const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./db");

const User = require("./models/User");
const Video = require("./models/Video");
const Download = require("./models/Download");

const downloadRoutes = require("./routes/download.routes");

connectDB();
const app = express();
app.use(cors());

app.use(express.json());

app.use("/api/downloads", downloadRoutes);

app.use("/api/downloads", downloadRoutes);

app.get("/test-db", async (req, res) => {
  try {
    const testUser = await User.create({
      name: "Test User",
      email: `test${Date.now()}@example.com`,
      plan: "free",
    });

    res.json({
      success: true,
      message: "MongoDB is working!",
      user: testUser,
    });
  } catch (error) {
    console.error("Database test failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Database test failed",
      error: error.message,
    });
  }
});

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
