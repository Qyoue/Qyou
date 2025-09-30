import express from "express";
import { getMe } from "../controller/userController";
import { updateMe } from "../controller/userController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

export default router;
