import bcrypt from "bcrypt";
import z from "zod";
import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import { clearCookie, setCookie } from "../utils/cookie.js";
import { loginSchema, registerSchema } from "../validators/authSchema.js";
import { userNameSchema } from "../validators/userSchema.js";

export const register = async (req, res, next) => {
  try {
    const { success, data, error } = registerSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { name, email, password } = data;

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(400).json({
        status: false,
        errors: { email: "Email already exists" },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const username = email.split("@")[0] + Date.now().toString(36);

    await User.create({ name, username, email, password: hashedPassword });

    res
      .status(201)
      .json({ status: true, data: { message: "Registration successful" } });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { success, data, error } = loginSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }

    const { email, password } = data;

    const user = await User.findOne({ email })
      .select("+password -email -username -name -createdAt -updatedAt -__v")
      .lean();
    if (!user) {
      return res.status(401).json({
        status: false,
        errors: { message: "Invalid email or password" },
      });
    }
    if (!user.password) {
      return res.status(400).json({
        status: false,
        errors: {
          message:
            "It seems like you have registered with social login buttons (eg: google). Please login with the same.",
        },
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        status: false,
        errors: { message: "Invalid email or password" },
      });
    }

    const loginCount = await Session.countDocuments({
      userId: user._id,
    }).lean();

    if (loginCount > 0) {
      // n+1 devices/sessions allowed
      await Session.deleteMany({ userId: user._id });
    }

    const session = await Session.create({ userId: user._id });

    setCookie(req, res, "token", session.id);

    return res.status(200).json({
      status: true,
      data: { message: "Login successful" },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyToken = async (req, res, next) => {
  try {
    const { token } = req.signedCookies;

    if (!token) {
      clearCookie(req, res, "token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: No token found",
          path: "/login",
        },
      });
    }
    const session = await Session.findById(token)
      .select("userId")
      .populate({
        path: "userId",
        select: "name email username",
      })
      .lean();

    if (!session) {
      clearCookie(req, res, "token");
      return res.status(401).json({
        status: false,
        errors: {
          message: "Unauthorized: Invalid session",
          path: "/login",
        },
      });
    }
    const user = {
      id: session.userId._id,
      name: session.userId.name,
      email: session.userId.email,
      username: session.userId.username,
    };
    return res.status(200).json({
      status: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { token } = req.signedCookies;
    await Session.findByIdAndDelete(token);
    clearCookie(req, res, "token");
    return res.status(200).json({
      status: true,
      data: { message: "Logout successful" },
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    return res.status(200).json({
      status: true,
      data: { user },
    });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { success, data, error } = userNameSchema.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        status: false,
        errors: z.flattenError(error).fieldErrors,
      });
    }
    const { name } = data;

    await User.findByIdAndUpdate(req.user._id, { name }, { new: true });

    return res.status(200).json({
      status: true,
      data: { message: "Profile updated successfully" },
    });
  } catch (err) {
    next(err);
  }
};
