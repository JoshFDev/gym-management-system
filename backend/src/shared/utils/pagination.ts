import { Model, Document } from "mongoose";

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const paginate = async <T extends Document>(
    model: Model<T>,
    filter: Record<string, any> = {},
    page: number = 1,
    limit: number = 20,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    populate?: string | any
): Promise<PaginatedResult<T>> => {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        model.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .populate(populate as any),
        model.countDocuments(filter),
    ]);

    return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    };
};
