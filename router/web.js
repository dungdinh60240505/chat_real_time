import { Router } from "express";
import User from "../model/user/user.js";
import Message from '../model/message/message.js';
import Conversation from '../model/conversation/conversation.js';
const webRouter = Router();
import { fileURLToPath } from "node:url";
import path, { dirname } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

import {authMiddleware} from "../middleware/auth.js";

webRouter.get("/", (req, res) => {
  res.sendFile(path.join(__dirname,"..","views","auth.html"));
});

webRouter.get("/main",authMiddleware,async (req, res) => {
  const userId = req.user.sub;
  const user =await User.findById(userId);
  if (!user) return res.status(404).json({ message: "Không tìm thấy user" });
  res.render("main", {username: user.username, userId: userId});   // views/main.ejs
});

export default webRouter;