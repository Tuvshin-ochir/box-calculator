import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    valueMnt: { type: Number, required: true, min: 0 },
    probabilityPpm: { type: Number, required: true, min: 0, max: 1_000_000 },
  },
  { _id: false },
);

const calculationsSchema = new mongoose.Schema(
  {
    priceMnt: Number,
    totalPpm: Number,
    differencePpm: Number,
    weightedValueNumerator: String,
    expectedValueMnt: Number,
    rtpBps: Number,
    rtpPercent: Number,
    houseEdgeBps: Number,
    houseEdgePercent: Number,
    expectedPlatformProfitMnt: Number,
    userProfitProbabilityPpm: Number,
    userProfitProbabilityPercent: Number,
  },
  { _id: false },
);

const versionSchema = new mongoose.Schema(
  {
    versionNumber: { type: Number, required: true },
    priceMnt: { type: Number, required: true },
    items: { type: [itemSchema], default: [] },
    calculations: calculationsSchema,
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } },
);

const boxSchema = new mongoose.Schema(
  {
    name: { type: String, default: "Untitled Box", trim: true },
    priceMnt: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["DRAFT", "LIVE"],
      default: "DRAFT",
    },
    currentVersion: { type: Number, default: 1 },
    maxRtpBps: { type: Number, required: true, min: 0 },
    items: { type: [itemSchema], default: [] },
    calculations: calculationsSchema,
    versions: { type: [versionSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model("Box", boxSchema);
