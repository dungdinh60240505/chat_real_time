import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: '/image/default-avatar.jpg'
    },
    lastSeen: {
      type: Date,
    },
    isOnline: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    username: this.username,
    email: this.email,
    avatarUrl: this.avatarUrl,
    status: this.status,
    lastSeen: this.lastSeen,
  };
};

const User = model("User", userSchema);

export default User;
