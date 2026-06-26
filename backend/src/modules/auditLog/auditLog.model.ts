import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: string;
  changes?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, enum: ["CREATE", "UPDATE", "DELETE"], required: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: { type: String, required: true },
    changes: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);