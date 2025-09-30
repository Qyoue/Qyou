import { Response } from "express";
import { AuthRequest } from "../middleware/auth";

// GET /api/users/me
export const getMe = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // return safe user info (exclude sensitive fields)
  const safeUser = {
    id: req.user.id,
    fullName: req.user.fullName,
    email: req.user.email,
    // fullName can come from DB in a real app
  };

  res.json(safeUser);
};



// PUT /api/users/me
export const updateMe = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fullName } = req.body;

  // Simple validation
  if (!fullName || typeof fullName !== "string" || fullName.length < 2) {
    return res.status(400).json({ message: "Invalid fullName" });
  }

  // ⚡ In real implementation → update DB with req.user.id
  const updatedUser = {
    id: req.user.id,
    email: req.user.email,
    fullName: req.user.fullName,
  };

  res.json(updatedUser);
};