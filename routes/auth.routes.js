import { Router } from "express";

import {
  getProfile,
  login,
  logout,
  register,
  updateProfile,
  verifyToken,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-token", verifyToken);
router.post("/logout", logout);
router.route("/profile").get(getProfile).put(updateProfile);

export default router;
