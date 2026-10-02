"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterInventoryController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let MasterInventoryController = class MasterInventoryController {
    prisma = new client_1.PrismaClient();
    async createProduct(data) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const product = await tx.product.create({
                    data: {
                        company: data.company,
                        name: data.name,
                        sku: data.sku,
                        category: data.category || 'General',
                        purchasePrice: parseFloat(data.purchasePrice) || 0,
                        sellingPrice: parseFloat(data.sellingPrice) || 0,
                        minQuantity: parseInt(data.minQuantity) || 10,
                        reorderLevel: parseInt(data.reorderLevel) || 20,
                        unit: data.unit || 'pcs',
                        vatSetting: data.vatSetting || 'NONE',
                        currentStock: parseInt(data.initialQuantity) || 0,
                        imageUrl: data.imageUrl || null,
                        barcode: data.barcode || null,
                        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
                    }
                });
                if (data.initialQuantity && parseInt(data.initialQuantity) > 0) {
                    await tx.inventoryMovement.create({
                        data: {
                            company: data.company,
                            productId: product.id,
                            productName: product.name,
                            sku: product.sku,
                            type: 'RECEIVE',
                            quantity: parseInt(data.initialQuantity),
                            previousStock: 0,
                            newStock: parseInt(data.initialQuantity),
                            remarks: 'Initial System Entry (Master Stock)',
                            user: data.username || 'System Admin',
                            warehouseId: null,
                            employeeId: null,
                            batchNumber: data.batchNumber || null,
                            expirationDate: data.expirationDate ? new Date(data.expirationDate).toISOString() : null,
                        }
                    });
                }
                return product;
            });
        }
        catch (error) {
            throw new Error(`Unified Product Creation Error: ${error.message}`);
        }
    }
    async findAllProducts(company) {
        if (!company)
            return [];
        return this.prisma.product.findMany({ where: { company }, orderBy: { id: 'desc' } });
    }
    async updateProduct(id, data) {
        const { id: _id, username, initialQuantity, warehouseId, batchNumber, expirationDate, previousImageUrl, currentStock, ...cleanData } = data;
        if (cleanData.createdAt)
            cleanData.createdAt = new Date(cleanData.createdAt);
        if (cleanData.deletedAt)
            cleanData.deletedAt = new Date(cleanData.deletedAt);
        if (cleanData.purchasePrice !== undefined)
            cleanData.purchasePrice = parseFloat(cleanData.purchasePrice) || 0;
        if (cleanData.sellingPrice !== undefined)
            cleanData.sellingPrice = parseFloat(cleanData.sellingPrice) || 0;
        if (cleanData.minQuantity !== undefined)
            cleanData.minQuantity = parseInt(cleanData.minQuantity) || 10;
        if (cleanData.reorderLevel !== undefined)
            cleanData.reorderLevel = parseInt(cleanData.reorderLevel) || 20;
        if (currentStock !== undefined)
            cleanData.currentStock = parseInt(currentStock) || 0;
        return this.prisma.product.update({
            where: { id: parseInt(id) },
            data: cleanData
        });
    }
    async removeProduct(id) {
        return this.prisma.product.delete({ where: { id: parseInt(id) } });
    }
    async createMovement(data) {
        return this.prisma.inventoryMovement.create({
            data: {
                productId: data.productId,
                productName: data.productName,
                sku: data.sku,
                type: data.type,
                quantity: data.quantity,
                previousStock: data.previousStock,
                newStock: data.newStock,
                reference: data.reference,
                remarks: data.remarks,
                user: data.user,
                company: data.company,
                date: new Date(),
                batchNumber: data.batchNumber || null,
                expirationDate: data.expirationDate ? new Date(data.expirationDate).toISOString() : null,
                warehouseId: data.warehouseId ? parseInt(data.warehouseId) : null,
                employeeId: data.employeeId ? parseInt(data.employeeId) : null,
            }
        });
    }
    async findAllMovements(company) {
        return this.prisma.inventoryMovement.findMany({
            where: { company },
            orderBy: { date: 'desc' },
            include: { warehouse: true, employee: true }
        });
    }
    async clearHistory(company) {
        return this.prisma.inventoryMovement.deleteMany({ where: { company } });
    }
    async createWarehouse(data) {
        return this.prisma.warehouse.create({
            data: {
                company: data.company,
                name: data.name,
                address: data.location || data.address || 'Not Specified',
                status: data.status || 'Active',
            }
        });
    }
    async findAllWarehouses(company) {
        if (!company)
            return [];
        return this.prisma.warehouse.findMany({ where: { company }, orderBy: { id: 'asc' } });
    }
    async updateWarehouse(id, data) {
        return this.prisma.warehouse.update({
            where: { id: parseInt(id) },
            data: { name: data.name, address: data.location || data.address, status: data.status }
        });
    }
    async removeWarehouse(id) {
        const wId = parseInt(id);
        return await this.prisma.$transaction(async (tx) => {
            await tx.inventoryMovement.updateMany({
                where: { warehouseId: wId },
                data: { warehouseId: null, remarks: 'Facility Deleted (Archived Record)' }
            });
            await tx.warehouseStock.deleteMany({
                where: { warehouseId: id }
            });
            return tx.warehouse.delete({ where: { id: wId } });
        });
    }
    async assignStock(data) {
        const safeProductId = parseInt(data.productId);
        const safeWarehouseId = String(data.warehouseId);
        const safeQuantity = parseInt(data.quantity);
        const existingStock = await this.prisma.warehouseStock.findFirst({
            where: { warehouseId: safeWarehouseId, productId: safeProductId }
        });
        if (existingStock) {
            return this.prisma.warehouseStock.update({
                where: { id: existingStock.id },
                data: { quantity: existingStock.quantity + safeQuantity, lastUpdated: new Date() }
            });
        }
        else {
            return this.prisma.warehouseStock.create({
                data: {
                    warehouseId: safeWarehouseId,
                    productId: safeProductId,
                    sku: data.sku,
                    quantity: safeQuantity,
                    company: data.company
                }
            });
        }
    }
    async getStock(company) {
        if (!company)
            return [];
        return this.prisma.warehouseStock.findMany({ where: { company } });
    }
    async clearAllHubStocks(company) {
        return this.prisma.warehouseStock.deleteMany({ where: { company } });
    }
};
exports.MasterInventoryController = MasterInventoryController;
__decorate([
    (0, common_1.Post)('products'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Get)('products'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "findAllProducts", null);
__decorate([
    (0, common_1.Patch)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "removeProduct", null);
__decorate([
    (0, common_1.Post)('inventory-movements'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "createMovement", null);
__decorate([
    (0, common_1.Get)('inventory-movements'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "findAllMovements", null);
__decorate([
    (0, common_1.Delete)('inventory-movements/clear/:company'),
    __param(0, (0, common_1.Param)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "clearHistory", null);
__decorate([
    (0, common_1.Post)('warehouses'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "createWarehouse", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "findAllWarehouses", null);
__decorate([
    (0, common_1.Patch)('warehouses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "updateWarehouse", null);
__decorate([
    (0, common_1.Delete)('warehouses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "removeWarehouse", null);
__decorate([
    (0, common_1.Post)('warehouse-stock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "assignStock", null);
__decorate([
    (0, common_1.Get)('warehouse-stock'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "getStock", null);
__decorate([
    (0, common_1.Delete)('warehouse-stock/clear/:company'),
    __param(0, (0, common_1.Param)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MasterInventoryController.prototype, "clearAllHubStocks", null);
exports.MasterInventoryController = MasterInventoryController = __decorate([
    (0, common_1.Controller)()
], MasterInventoryController);
//# sourceMappingURL=master-inventory.controller.js.map