import mongoose from "mongoose";

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    content: {
      type: String,
      trim: true,
    },

    messageType: {
      type: String,
      enum: ["text", "image", "file", "system"],
      default: "text",
    },

    files: [
      {
        type: Schema.Types.ObjectId,
        ref: "File",
      },
    ],

    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index cho sort theo thời gian trong một conversation
messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = model("Message", messageSchema);

export default Message;
