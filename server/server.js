require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Board = require("./models/Board");
const authRoutes = require("./routes/auth");
const { verifyToken } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", authRoutes);

app.get("/", (_req, res) => res.send("Whiteboard server is running"));
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ["GET", "POST"] }
});

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    const payload = verifyToken(token);
    socket.user = { id: payload.id, name: payload.name, email: payload.email };
    next();
  } catch {
    next(new Error("Unauthorized: please log in again."));
  }
});

io.on("connection", (socket) => {
  console.log(`Authenticated user connected: ${socket.user.email} (${socket.id})`);

  socket.on("join-room", async (rawRoomId, callback) => {
    try {
      const roomId = String(rawRoomId || "").trim();
      if (!roomId || roomId.length > 80) {
        if (typeof callback === "function") callback({ ok: false, message: "Room ID must be 1–80 characters." });
        return;
      }

      // This app keeps each socket in one whiteboard room at a time.
      for (const existingRoom of socket.rooms) {
        if (existingRoom !== socket.id) socket.leave(existingRoom);
      }

      let board = await Board.findOne({ roomId });
      if (!board) {
        try {
          board = await Board.create({ roomId, drawings: [] });
        } catch (error) {
          if (error.code === 11000) board = await Board.findOne({ roomId });
          else throw error;
        }
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.emit("load-drawing", board.drawings);
      socket.emit("room-joined", roomId);
      if (typeof callback === "function") callback({ ok: true, roomId });
      socket.to(roomId).emit("user-joined", { name: socket.user.name, userId: socket.user.id });
      console.log(`${socket.user.email} joined room ${roomId}`);
    } catch (error) {
      console.error("Join room error:", error);
      if (typeof callback === "function") callback({ ok: false, message: "Could not join this room." });
    }
  });

  socket.on("draw", async (data) => {
    try {
      const roomId = socket.data.roomId;
      if (!roomId || !data || data.roomId !== roomId) return;
      const values = [data.x0, data.y0, data.x1, data.y1, data.lineWidth];
      if (!values.every(Number.isFinite) || values.some((v) => Math.abs(v) > 100000)) return;
      const color = /^#[0-9a-fA-F]{6}$/.test(String(data.color)) ? data.color : "#000000";
      const lineWidth = Math.min(50, Math.max(1, Number(data.lineWidth)));

      const segment = {
        x0: Number(data.x0), y0: Number(data.y0),
        x1: Number(data.x1), y1: Number(data.y1),
        color, lineWidth
      };

      await Board.updateOne(
        { roomId },
        { $push: { drawings: segment }, $set: { updatedAt: new Date() } }
      );
      socket.to(roomId).emit("draw", { ...segment, roomId });
    } catch (error) {
      console.error("Drawing save error:", error);
      socket.emit("app-error", "A drawing segment could not be saved.");
    }
  });

  socket.on("clear", async () => {
    try {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      await Board.updateOne({ roomId }, { $set: { drawings: [], updatedAt: new Date() } });
      io.to(roomId).emit("clear");
    } catch (error) {
      console.error("Clear board error:", error);
      socket.emit("app-error", "Could not clear this board.");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Configure server/.env.");
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random string at least 32 characters long.");
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected successfully");
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

start().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
