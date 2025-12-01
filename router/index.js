import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
const { Types } = mongoose;
import User from "../model/user/user.js";
import Conversation from "../model/conversation/conversation.js";
import Message from "../model/message/message.js";
import File from "../model/file/file.js";
import {authMiddleware,generateAccessToken} from "../middleware/auth.js";
import upload from "../config/multer.js";
const router = express.Router();

// =====================================================
// 1. AUTH: Đăng ký, đăng nhập, lấy thông tin bản thân
// =====================================================

// Đăng ký
router.post("/auth/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Thiếu username, email hoặc password" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    //hash rồi lưu vào DB
    const user = await User.create({
      username,
      email,
      passwordHash,
    });
    // sau khi đăng kí thành công thì tạo access token
    const accessToken = generateAccessToken(user);

    return res.status(201).json({
      message: "Đăng ký thành công",
      accessToken,
      user: user.toPublicJSON(),//trả về dữ liệu user dạng json
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Lỗi server khi đăng ký" });
  }
});

// Đăng nhập
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Thiếu email hoặc password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    //băm password ra và so sánh với passwordHash
    if (!match) {
      return res.status(401).json({ message: "Sai email hoặc mật khẩu" });
    }
    //đăng nhập xong thì tạo access token
    const token = generateAccessToken(user);
    //đính nó vào cả cookie
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 });
    
    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Lỗi server khi đăng nhập" });
  }
});

// Lấy thông tin chính mình
router.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "Không tìm thấy user" });

    return res.json({ user: user.toPublicJSON() });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Lỗi server" });
  }
});

// =====================================================
// 2. CONVERSATION: tạo, lấy danh sách, chi tiết
// =====================================================

//lấy danh sách user
router.get("/users", authMiddleware, async (req,res) => {
  try{
    const this_username = req.user.username;
    const users = await User.find();
    return res.json({users, username: this_username});
  } catch (error) {
    console.log("Lỗi khi lấy danh sách user", error);
    return res.status(500).json({ message: "Lỗi khi lấy danh sách user"});
  }
})

// Lấy danh sách conversation của user
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const conversations = await Conversation.find({
      "members.user": userId,
    })
      .sort({ updatedAt: -1 })
      .populate("members.user", "username avatarUrl")
      .populate("lastMessage");

    return res.status(200).json({ conversations });
  } catch (err) {
    console.error("Get conversations error:", err);
    return res.status(500).json({ message: "Lỗi server khi lấy danh sách conversation" });
  }
});


// Tạo conversation mới (1-1 hoặc group)
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub; // lấy id người dùng
    const { title, memberIds, isGroup } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "Cần truyền danh sách thành viên" });
    }
    const uniqueMembers = [...new Set([userId, ...memberIds])];
    // convert sang ObjectId + sort cho cố định thứ tự
    const sortedMembers = uniqueMembers
      .map(id => new Types.ObjectId(id))
      .sort((a, b) => a.toString().localeCompare(b.toString()));
    //Check xem đã có chưa
    let existing = await Conversation.findOne({
      "members.user": { $all : sortedMembers},
      members: { $size : sortedMembers.length },
      isGroup: !!isGroup
    }).populate("members.user", "username avatarUrl");


    if(existing){
      return res.status(200).json({ conversation: existing });
    }

    
    const members = sortedMembers.map(id => ({
      user: id,
      joinedAt: new Date(),
    }));
    const conversation = await Conversation.create({
      title: isGroup ? title || "Nhóm mới" : null,
      isGroup: !!isGroup, // !! để convert thành true, false
      members,
      admins: [userId],
      createdBy: userId,
      lastActiveAt: new Date(),
    });
    console.log(conversation);
    const populated = await Conversation.findById(conversation._id)
      .populate("members.user", "username avatarUrl");

    return res.status(201).json({ conversation: populated });
  } catch (err) {
    console.error("Create conversation error:", err);
    return res.status(500).json({ message: "Lỗi server khi tạo conversation" });
  }
});



// Lấy chi tiết conversation
router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;//lưu trong jwt
    const { id } = req.params;

    const conversation = await Conversation.findById(id)
      .populate("members.user", "username avatarUrl")
      .populate("admins", "username avatarUrl");

    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy conversation" });
    }

    const isMember = conversation.members.some(
      m => m.user._id.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });
    }

    return res.json({ conversation });
  } catch (err) {
    console.error("Get conversation error:", err);
    return res.status(500).json({ message: "Lỗi server khi lấy chi tiết conversation" });
  }
});

// =====================================================
// 3. MESSAGES: lấy lịch sử, gửi tin nhắn
// =====================================================

// Lấy tin nhắn trong conversation
router.get("/conversations/:id/messages", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { id } = req.params;
    const limit = parseInt(req.query.limit || "50", 10);

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: "Không tìm thấy conversation" });
    }

    const isMember = conversation.members.some(
      m => m.user.toString() === userId
    );
    if (!isMember) {
      return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });
    }

    const messages = await Message.find({ conversation: id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "username avatarUrl")
      .populate("attachments")
      .populate("replyTo");

    const reversed = messages.reverse();

    return res.json({ messages: reversed });
  } catch (err) {
    console.error("Get messages error:", err);
    return res.status(500).json({ message: "Lỗi server khi lấy tin nhắn" });
  }
});

//xử lí gửi ảnh
router.post(
  `/messages/image`,
  authMiddleware,          // nếu có auth
  upload.single("file"),   // field "file" trùng với FormData.append("file", ...)
  async (req, res) => {
    try {
      const { conversationId, content = "" } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ ok: false, error: "Không có file" });
      }

      // 1. tạo message mới
      const message = await Message.create({
        conversation: conversationId,
        sender: req.user._id.toString(),
        content: content || "[image]",  // hoặc để rỗng
        // có thể thêm type: "image"
      });

      // 2. tạo File gắn với message
      const fileDoc = await File.create({
        uploader: req.user._id.toString(),
        conversation: conversationId,
        message: message._id,
        url: `/upload/${file.filename}`,        // sau này cho static
        fileName: file.originalname,
        fileType: file.mimetype,
        size: file.size,
        // metadata: có thể bổ sung nếu dùng thư viện như sharp hoặc ffprobe
      });

      // 3. chuẩn hóa message trả về cho frontend
      const normalized = {
        id: message._id.toString(),
        conversation: message.conversation,
        sender: message.sender,
        content: message.content,
        createdAt: message.createdAt,
        files: [
          {
            id: fileDoc._id.toString(),
            url: fileDoc.url,
            fileName: fileDoc.fileName,
            fileType: fileDoc.fileType,
            size: fileDoc.size,
          },
        ],
      };

      // 4. emit socket để các client khác nhận được
      io.to(conversationId).emit("chat:message", normalized);

      res.json({ ok: true, message: normalized });
    } catch (err) {
      console.error("send image error:", err);
      res.status(500).json({ ok: false, error: "Lỗi server" });
    }
  }
);

export default router;

// =====================================================
// 4. REACTION: thả emoji vào tin nhắn
// =====================================================

// router.post("/messages/:id/reactions", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.sub;
//     const { id } = req.params;
//     const { emoji } = req.body;

//     if (!emoji) {
//       return res.status(400).json({ message: "Thiếu emoji" });
//     }

//     const message = await Message.findById(id).populate("conversation");
//     if (!message) {
//       return res.status(404).json({ message: "Không tìm thấy message" });
//     }

//     const conversation = message.conversation;
//     const isMember = conversation.members.some(
//       m => m.user.toString() === userId
//     );
//     if (!isMember) {
//       return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });
//     }

//     const reaction = await Reaction.findOneAndUpdate(
//       { message: id, user: userId, emoji },
//       { message: id, user: userId, emoji },
//       { upsert: true, new: true }
//     );

//     return res.status(201).json({ reaction });
//   } catch (err) {
//     console.error("Reaction error:", err);
//     return res.status(500).json({ message: "Lỗi server khi tạo reaction" });
//   }
// });

// // Xoá reaction
// router.delete("/messages/:id/reactions", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.sub;
//     const { id } = req.params;
//     const { emoji } = req.body;

//     if (!emoji) {
//       return res.status(400).json({ message: "Thiếu emoji" });
//     }

//     await Reaction.findOneAndDelete({
//       message: id,
//       user: userId,
//       emoji,
//     });

//     return res.json({ message: "Đã xoá reaction" });
//   } catch (err) {
//     console.error("Delete reaction error:", err);
//     return res.status(500).json({ message: "Lỗi server khi xoá reaction" });
//   }
// });

// =====================================================
// 5. MEMBER SETTINGS: mute, nickname trong group
// =====================================================

// router.patch("/conversations/:id/settings", authMiddleware, async (req, res) => {
//   try {
//     const userId = req.user.sub;
//     const { id } = req.params;
//     const { nickname, isMuted, mutedUntil } = req.body;

//     const conversation = await Conversation.findById(id);
//     if (!conversation) {
//       return res.status(404).json({ message: "Không tìm thấy conversation" });
//     }

//     const isMember = conversation.members.some(
//       m => m.user.toString() === userId
//     );
//     if (!isMember) {
//       return res.status(403).json({ message: "Bạn không thuộc cuộc trò chuyện này" });
//     }

//     const settings = await MemberSettings.findOneAndUpdate(
//       { user: userId, conversation: id },
//       {
//         user: userId,
//         conversation: id,
//         ...(nickname !== undefined && { nickname }),
//         ...(isMuted !== undefined && { isMuted }),
//         ...(mutedUntil !== undefined && { mutedUntil }),
//       },
//       { upsert: true, new: true }
//     );

//     return res.json({ settings });
//   } catch (err) {
//     console.error("Member settings error:", err);
//     return res.status(500).json({ message: "Lỗi server khi cập nhật cài đặt thành viên" });
//   }
// });


