import mongoose from "mongoose";

const { Schema, model } = mongoose;

const conversationSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },

    isGroup: {
      type: Boolean,
      default: false,
    },

    // Thành viên trong conversation
    members: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now(),
        },
      },
    ],

    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    avatarUrl: {
      type: String,
      trim: true,
    },

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },

    lastActiveAt: {
      type: Date,
      default: Date.now()
    },
  },
  {
    timestamps: true,
  }
);

// Gợi ý index để tìm những conversation của user
conversationSchema.index({ "members.user": 1 });

const Conversation = model("Conversation", conversationSchema);

export default Conversation;
