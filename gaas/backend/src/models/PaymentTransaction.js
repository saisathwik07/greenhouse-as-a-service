const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true, index: true },
    paymentId: { type: String, required: true, trim: true },
    orderId: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 }, // paise
    status: { type: String, enum: ["success", "failed"], default: "success" },
    paymentDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PaymentTransaction ||
  mongoose.model("PaymentTransaction", paymentTransactionSchema);
