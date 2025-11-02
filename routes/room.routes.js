import { Router } from "express";
import { createRoom, roomStatus } from "../controllers/room.controller.js";

const router = Router();

router.post("/create", createRoom);

router.get("/:roomId/status", roomStatus);
router
  .route("/:roomId")
  .get((req, res, next) => {})
  .delete((req, res, next) => {});
router.post("/:roomId/join", (req, res, next) => {});
router.post("/:roomId/leave", (req, res, next) => {});

export default router;
