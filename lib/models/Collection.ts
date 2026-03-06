import mongoose, { Schema, models, model } from "mongoose";

const RequestSchema = new Schema(
  {
    _id: { type: String, default: () => crypto.randomUUID() },
    name: String,
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      default: "GET",
    },
    url: String,
    headers: [
      {
        key: String,
        value: String,
        enabled: { type: Boolean, default: true },
      },
    ],
    queryParams: [
      {
        key: String,
        value: String,
        enabled: { type: Boolean, default: true },
      },
    ],
    body: {
      mode: {
        type: String,
        enum: ["none", "json", "text", "form-urlencoded"],
        default: "none",
      },
      json: Schema.Types.Mixed,
      text: String,
      formUrlEncoded: [
        {
          key: String,
          value: String,
          enabled: { type: Boolean, default: true },
        },
      ],
    },
    auth: {
      type: {
        type: String,
        default: "none",
      },
      basic: {
        username: String,
        password: String,
      },
    },
  },
  { _id: true }
);

const CollectionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: String,
    requests: [RequestSchema],
  },
  { timestamps: true }
);

export default models.Collection || model("Collection", CollectionSchema);
