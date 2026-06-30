import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { AuthRequest } from "../../shared/middlewares/authenticate";
import { createProduct, getProducts, getProductById, updateProduct, deactivateProduct, reactivateProduct, getCategories, toggleFeatured } from "./product.service";
import { toProductResponse } from "./product.dto";
import { asyncHandler } from "../../shared/middlewares/asyncHandler";
import { logAudit } from "../auditLog/auditLog.service";
import { notifyAll } from "../../shared/services/socket.service";

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await createProduct(req.body);

    await logAudit({
        action: "CREATE",
        entity: "Product",
        entityId: product._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
    });

    notifyAll({
        type: "product_created",
        title: "Producto creado",
        message: `${product.name} fue creado por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(201).json({ success: true, message: "Producto creado exitosamente.", data: toProductResponse(product) });
});

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
    const products = await getProducts();
    res.status(200).json({ success: true, data: products.map(toProductResponse) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
    const product = await getProductById(req.params.id as string);
    res.status(200).json({ success: true, data: toProductResponse(product) });
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await updateProduct(req.params.id as string, req.body);

    await logAudit({
        action: "UPDATE",
        entity: "Product",
        entityId: product._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
        changes: req.body,
    });

    notifyAll({
        type: "product_updated",
        title: "Producto actualizado",
        message: `${product.name} fue modificado por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: "Producto actualizado exitosamente.", data: toProductResponse(product) });
});

export const deactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await deactivateProduct(req.params.id as string);

    await logAudit({
        action: "DELETE",
        entity: "Product",
        entityId: product._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
        changes: { status: "inactive" },
    });

    notifyAll({
        type: "product_deactivated",
        title: "Producto desactivado",
        message: `${product.name} fue desactivado por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: "Producto desactivado exitosamente.", data: toProductResponse(product) });
});

export const reactivate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await reactivateProduct(req.params.id as string);

    await logAudit({
        action: "UPDATE",
        entity: "Product",
        entityId: product._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
        changes: { status: "active" },
    });

    notifyAll({
        type: "product_reactivated",
        title: "Producto reactivado",
        message: `${product.name} fue reactivado por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: "Producto reactivado exitosamente.", data: toProductResponse(product) });
});

export const categories = asyncHandler(async (_req: Request, res: Response) => {
    const cats = await getCategories();
    res.status(200).json({ success: true, data: cats });
});

export const toggleFeaturedHandler = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await toggleFeatured(req.params.id as string);

    await logAudit({
        action: "UPDATE",
        entity: "Product",
        entityId: product._id.toString(),
        userId: req.user!.userId,
        userRole: req.user!.role,
        changes: { featured: product.featured },
    });

    notifyAll({
        type: product.featured ? "product_reactivated" : "product_deactivated",
        title: product.featured ? "Producto destacado" : "Producto no destacado",
        message: `${product.name} ${product.featured ? "marcado como destacado" : "quitado de destacados"} por ${req.user!.role}`,
        timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, data: toProductResponse(product) });
});

export const uploadImage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await getProductById(req.params.id as string);
    if (!req.file) {
        res.status(400).json({ success: false, message: "No se envió ninguna imagen." });
        return;
    }
    const imageUrl = `/uploads/products/${req.file.filename}`;
    const images = [...(product.images || []), imageUrl].slice(-3);
    const updated = await updateProduct(product._id.toString(), { image: imageUrl, images });
    res.status(200).json({ success: true, message: "Imagen subida exitosamente.", data: toProductResponse(updated) });
});

export const deleteImage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const product = await getProductById(req.params.id as string);
    const index = parseInt(req.params.index as string, 10);
    const images = product.images || [];
    if (index >= 0 && index < images.length) {
        const imgPath = images[index];
        const filePath = path.join(__dirname, "../../../../", imgPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        images.splice(index, 1);
    }
    const newImage = images.length > 0 ? images[images.length - 1] : undefined;
    const updated = await updateProduct(product._id.toString(), { image: newImage, images });
    res.status(200).json({ success: true, message: "Imagen eliminada.", data: toProductResponse(updated) });
});
