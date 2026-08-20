const mongoose = require("mongoose");

const StickySchema = new mongoose.Schema(
  {
    guildId: {
      type: String,
      required: true,
      index: true,
    },

    channelId: {
      type: String,
      required: true,
      unique: true,
    },

    content: {
      type: String,
      required: true,
      maxlength: 2000,
    },

    messageId: {
      type: String,
      default: null,
    },

    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Sticky", StickySchema);
