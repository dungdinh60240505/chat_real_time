import "dotenv/config";
import jwt from "jsonwebtoken";
import express from "express";
import session from 'express-session';
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
const { Types } = mongoose;
import multer from "multer";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { fileURLToPath } from 'node:url';
import path, { dirname } from 'node:path';
import router from './router/index.js';
import webRouter from './router/web.js';
import User from "./model/user/user.js";
import Message from "./model/message/message.js";
import upload from "./config/multer.js";
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chatData";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-vietnam";
const app = express();
const server = http.createServer(app);

app.use(cookieParser());
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: "secret-key",  // Chìa khóa để mã hóa session
  resave: false,  // Không lưu lại session nếu không có thay đổi
  saveUninitialized: false,  // Không lưu session nếu không có dữ liệu
  cookie: {
    httpOnly: true,  // Đảm bảo cookie chỉ có thể được truy cập qua HTTP
    maxAge: 1000 * 60 * 60 * 24,  // Thời gian sống của cookie (1 ngày)
    secure: process.env.NODE_ENV === "production",  // Chỉ dùng cookie qua HTTPS khi ở môi trường sản xuất
    sameSite: "strict",  // Giới hạn cookie chỉ gửi trong cùng domain
  }
}));

const io = new Server(server,{
    cors:{
        origin: CLIENT_ORIGIN,
        methods: ["GET","POST"],
        credentials: true,
    },
});
app.set("io", io);

// kết nối mongoDB
mongoose.connect(MONGO_URI,{autoIndex:true})
        .then(() => { console.log("Đã kết nối database thành công!");})
        .catch((err) => { console.log("Lỗi khi kết nối database", err.message); process.exit(1);});

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "upload");
//setup các đường dẫn tĩnh
//__dirname là thư mục project
app.use(express.static(path.join(__dirname, "public")));
app.use("/upload", express.static(uploadDir));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


//middleware cho socket
const onlineUsers = new Map();  // Khai báo Map để lưu người dùng online
io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie || "";
  const tokenCookie = cookieHeader
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("token="));

  if (!tokenCookie) {
    return next(new Error("Authentication error: No token found"));
  }

  const token = tokenCookie.split("=")[1];

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("Error verifying token:", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }

    socket.user = decoded;
    next();
  });
});
//xử lí connection
io.on("connection", async (socket) => {
  console.log("User connected:", socket.id);
  // Kiểm tra thông tin người dùng từ socket.user (được lưu trong middleware xác thực)
  if (!socket.user || !socket.user.username) {
    console.log("User not authenticated or missing username");
    return socket.disconnect();  // Nếu không có username, ngắt kết nối
  }
  console.log(`Authenticated user: ${socket.user.username}`);
  // Lưu thông tin người dùng vào onlineUsers map
  onlineUsers.set(socket.id, { userId: socket.user.sub, username: socket.user.username, socketId: socket.id });
  // Cập nhật trạng thái isOnline của người dùng trong cơ sở dữ liệu
  try {
    const user = await User.findOneAndUpdate(
      { username: socket.user.username },  // Tìm người dùng theo username
      { isOnline: true },  // Cập nhật isOnline thành true
      { new: true }  // Trả về bản ghi đã cập nhật
    );
    if (!user) {
      console.log("Không thấy user để cập nhật online");
      throw new Error("Lỗi khi cập nhật status online cho user");
    }
    console.log(`${socket.user.username} is now online`);
  } catch (err) {
    console.error("Error updating user online status:", err);
  }


  socket.on("conversation:join", ({ conversationId }) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined room ${conversationId}`);
  });


  socket.on("chat:message", async ({ conversation, content }, ack) => {//conversation là ID, content là string
    try {
      const user = onlineUsers.get(socket.id);
      console.log("Đang xử lí việc gửi tin nhắn của user: ",user);
      if (!user) {
        ack?.({ ok: false, error: "User chưa join conversation" });
        return;
      }

      if (!content || !conversation) {
        ack?.({ ok: false, error: "Thiếu conversation hoặc content" });
        return;
      }

      const newMessage = await Message.create({
        conversation: new Types.ObjectId(conversation),
        sender: new Types.ObjectId(user.userId),
        content,
      });

      const msgPayload = {
        id: newMessage._id.toString(),
        conversation: newMessage.conversation.toString(),
        sender: newMessage.sender.toString(),
        content: newMessage.content,
        createdAt: newMessage.createdAt,
      };

      io.to(conversation).emit("chat:message", msgPayload);

      ack?.({ ok: true });
    } catch (error) {
      console.error("chat:message error:", error);
      ack?.({ ok: false, error: "Có lỗi phía server khi gửi tin" });
    }
  });
  // Lấy lịch sử
  // payload: { conversation, limit }
  socket.on("chat:history", async ({ conversation, limit = 50 }, ack) => {//conversation là ID cần lấy history
    console.log("Đang lấy tin nhắn cho cuộc trò chuyện");
    try {
      const messages = await Message.find({ conversation })
        .sort({ createdAt: -1 })
        .limit(limit);

      const normalized = messages
        .map((m) => ({
          id: m._id.toString(),
          conversation: m.conversation.toString(),
          sender: m.sender.toString(),
          content: m.content,
          createdAt: m.createdAt,
        }))
        .reverse();
        console.log(normalized);
      ack?.({ ok: true, messages: normalized });
    } catch (error) {
      console.error("chat:history error:", error);
      ack?.({ ok: false, error: "Không load được lịch sử" });
    }
  });

  socket.on("disconnect", async () => {
    const user = onlineUsers.get(socket.id);
    if (!user) {
      console.log("User không tồn tại khi disconnect");
      return;
    }
    try {
      const { username, conversation, email } = user;
      // Cập nhật trạng thái offline trong database
      await User.findOneAndUpdate(
        { email: email },
        { isOnline: false },
        { new: true }
      );
      // Xóa user khỏi map
      onlineUsers.delete(socket.id);
      console.log("🔌 Client disconnected:", socket.id, username);
      // Nếu user đang trong conversation, thông báo cho các user khác
      if (conversation) {
        const systemMessage = {
          sender: "system",
          content: `${username} đã rời phòng`,
          conversation,
          createdAt: new Date().toISOString(),
        };
        io.to(conversation).emit("system:message", systemMessage);
        // Cập nhật danh sách users
        const users = getUsersInConversation(conversation);
        io.to(conversation).emit("conversation:users", users);
      }
    } catch (error) {
      console.error("disconnect error:", error);
    }
  });

});


// mount router
app.use("/", webRouter);
app.use("/api", router);
server.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
});