import mongoose from "mongoose";

const { Schema, model } = mongoose;

const fileSchema = new Schema(
  {
    uploader: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },

    message: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },

    url: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      trim: true,
    },

    size: {
      type: Number,
    },

    metadata: {
      width: Number,
      height: Number,
      duration: Number,
      mime: String,
    },
  },
  {
    timestamps: true,
  }
);

const File = model("File", fileSchema);

export default File;
