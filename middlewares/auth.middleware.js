import Session from "../models/session.model.js";
import cookie from "cookie";
import { clearCookie } from "../utils/cookie.js";
import cookieParser from "cookie-parser";

export async function checkAuth(req, res, next) {
  try {
    const { token } = req.signedCookies || {};

    if (!token) {
      clearCookie(req, res, "token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: No token provided.",
          path: "/login",
        },
      });
    }

    const session = await Session.findById(token)
      .populate({
        path: "userId",
        select: "name username email updatedAt",
      })
      .lean();

    // Check if the session or the populated user exists.
    // This also handles cases where a user was deleted but the session wasn't.
    if (!session || !session.userId) {
      clearCookie(req, res, "token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: Invalid session.",
          path: "/login",
        },
      });
    }

    // Attach the populated user object to the request.
    req.user = session.userId;

    next();
  } catch (err) {
    clearCookie(req, res, "token");
    next(err);
  }
}

export async function checkSocketAuth(socket, next) {
  try {
    const cookieString = socket.handshake.headers.cookie || "";

    const { token: signedTokenValue } = cookie.parse(cookieString);

    if (!signedTokenValue) {
      return next(new Error("Authentication error: No token found."));
    }

    const token = cookieParser.signedCookie(
      signedTokenValue,
      process.env.COOKIE_SECRET
    );

    if (!token) {
      return next(new Error("Authentication error: Invalid cookie signature."));
    }

    const session = await Session.findById(token)
      .populate({
        path: "userId",
        select: "name username email updatedAt",
      })
      .lean();

    // Check if the session or the populated user exists.
    // This also handles cases where a user was deleted but the session wasn't.
    if (!session || !session.userId) {
      return next(new Error("Authentication error: Invalid session."));
    }

    socket.sessionId = session._id;
    socket.user = session.userId;
    next();
  } catch (err) {
    console.error("Socket auth error:", err.message);
    next(new Error("Authentication error."));
  }
}
