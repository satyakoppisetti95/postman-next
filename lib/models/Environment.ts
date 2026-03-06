import mongoose, { Schema, models, model } from "mongoose";

const EnvironmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    variables: [
      {
        key: String,
        value: String,
      },
    ],
  },
  { timestamps: true }
);

export default models.Environment || model("Environment", EnvironmentSchema);
