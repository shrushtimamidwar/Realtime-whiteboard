const mongoose = require("mongoose");

const drawingSchema = new mongoose.Schema(
  {
    x0: { type: Number, required: true },
    y0: { type: Number, required: true },
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    color: { type: String, required: true, maxlength: 30 },
    lineWidth: { type: Number, required: true, min: 1, max: 50 }
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    drawings: { type: [drawingSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Board", boardSchema);
