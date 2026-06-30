import { Schema, model, Document, Types } from "mongoose";
import { SaleStatus, BuyerType, PaymentMethod } from "./sale.types";

export interface ISaleItem {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface ISale extends Document {
    items: ISaleItem[];
    total: number;
    buyerType: BuyerType;
    buyerId?: Types.ObjectId;
    buyerName: string;
    buyerEmail?: string;
    paymentMethod: PaymentMethod;
    status: SaleStatus;
    registeredBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const saleItemSchema = new Schema<ISaleItem>(
    {
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const saleSchema = new Schema<ISale>(
    {
        items: { type: [saleItemSchema], required: true, validate: { validator: (v: ISaleItem[]) => v.length > 0, message: "Debe tener al menos un item" } },
        total: { type: Number, required: true, min: 0 },
        buyerType: { type: String, enum: Object.values(BuyerType), required: true },
        buyerId: { type: Schema.Types.ObjectId },
        buyerName: { type: String, required: true },
        buyerEmail: { type: String },
        paymentMethod: { type: String, enum: Object.values(PaymentMethod), required: true },
        status: { type: String, enum: Object.values(SaleStatus), default: SaleStatus.COMPLETED },
        registeredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
    { timestamps: true }
);

const Sale = model<ISale>("Sale", saleSchema);
export default Sale;
