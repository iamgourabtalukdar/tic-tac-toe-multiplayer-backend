import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectToDB } from "./config/db.js";
import { checkAuth } from "./middlewares/auth.middleware.js";
import roomRoutes from "./routes/room.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { initializeSocket } from "./socket/index.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  path: "/socket/",
  cors: {
    origin: "https://unnourished-resonantly-dulcie.ngrok-free.dev",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "localhost";

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());

// ======================================================
//               SOCKET.IO INITIALIZATION
// ======================================================
// 👇 ALL socket logic is now handled in this one function call
initializeSocket(io);
// ======================================================

app.use("/api/auth", authRoutes);
app.use("/api/room", checkAuth, roomRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    status: false,
    errors: { message: "Route not found" },
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error(error); // Log the error for debugging

  // Handle validation errors
  if (error.name === "ValidationError") {
    const errors = Object.keys(error.errors).reduce((acc, key) => {
      acc[key] = error.errors[key].message;
      return acc;
    }, {});

    return res.status(400).json({
      status: false,
      message: "Validation failed",
      errors,
    });
  }

  // Handle duplicate email error
  if (error.code === 11000) {
    return res.status(400).json({
      status: false,
      errors: { message: error.message || "Email already exists" },
    });
  }

  // Handle custom errors with status codes
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      status: false,
      errors: { message: error.message },
    });
  }

  // Handle duplicate email error
  if (error.name === "Error") {
    return res.status(400).json({
      status: false,
      errors: { message: error.message },
    });
  }

  // Handle other unexpected errors
  res.status(500).json({
    status: false,
    errors: { message: "Internal server error" },
  });
});

async function startServer() {
  try {
    await connectToDB();
    server.listen(PORT, HOST, () => {
      console.log(`Server is running at http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.log("Failed to start server", err);
    process.exit(1);
  }
}

startServer();
