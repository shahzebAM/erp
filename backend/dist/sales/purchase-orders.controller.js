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
exports.ProcurementController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let ProcurementController = class ProcurementController {
    prisma = new client_1.PrismaClient();
    async createSupplier(data) {
        const { company, legalName, tradeName, tin, address, contactPerson, phone, email, paymentTerms } = data;
        if (!company || !legalName || !tin || !address) {
            throw new common_1.BadRequestException('Company, Legal Name, TIN, and Address are required.');
        }
        const existing = await this.prisma.supplier.findFirst({
            where: { tin, company }
        });
        if (existing) {
            throw new common_1.ConflictException('A supplier with this TIN already exists.');
        }
        return await this.prisma.supplier.create({
            data: {
                company, legalName, tradeName: tradeName || null, tin, address,
                contactPerson: contactPerson || null, phone: phone || null, email: email || null,
                paymentTerms: paymentTerms || 'Cash on Delivery', apBalance: 0
            }
        });
    }
    async listSuppliers(company) {
        if (!company)
            throw new common_1.BadRequestException('Company is required.');
        return await this.prisma.supplier.findMany({
            where: { company },
            orderBy: { legalName: 'asc' }
        });
    }
    async updateSupplier(id, data) {
        const supplier = await this.prisma.supplier.findUnique({ where: { id } });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found.');
        const { legalName, tradeName, tin, address, contactPerson, phone, email, paymentTerms } = data;
        return await this.prisma.supplier.update({
            where: { id },
            data: { legalName, tradeName, tin, address, contactPerson, phone, email, paymentTerms }
        });
    }
    async deleteSupplier(id) {
        const supplier = await this.prisma.supplier.findUnique({
            where: { id },
            include: { purchaseOrders: true }
        });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found.');
        if (supplier.purchaseOrders && supplier.purchaseOrders.length > 0) {
            throw new common_1.BadRequestException('Cannot delete a supplier that has existing Purchase Orders.');
        }
        return await this.prisma.supplier.delete({ where: { id } });
    }
    async getNextPoNumber(company) {
        const lastPo = await this.prisma.purchaseOrder.findFirst({
            where: { company },
            orderBy: { createdAt: 'desc' }
        });
        let nextNum = 1;
        if (lastPo && lastPo.poNumber.match(/(\d+)$/)) {
            const match = lastPo.poNumber.match(/(\d+)$/);
            if (match) {
                nextNum = parseInt(match[0], 10) + 1;
                const prefix = lastPo.poNumber.substring(0, match.index);
                const padding = match[0].length;
                return { poNumber: `${prefix}${String(nextNum).padStart(padding, '0')}` };
            }
        }
        return { poNumber: 'PO-000001' };
    }
    async createPurchaseOrder(data) {
        const { company, items, isVatApplied, vatRate = 0.12, user, osReference, poNumber, supplierId } = data;
        if (!company || !items || items.length === 0 || !poNumber) {
            throw new common_1.BadRequestException('Missing required fields.');
        }
        const existing = await this.prisma.purchaseOrder.findUnique({ where: { poNumber } });
        if (existing)
            throw new common_1.BadRequestException(`P.O. Number ${poNumber} already exists!`);
        if (supplierId) {
            const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
            if (!supplier)
                throw new common_1.BadRequestException('The selected supplier does not exist.');
        }
        return await this.prisma.$transaction(async (tx) => {
            let calculatedSubtotal = 0;
            const cleanItems = items.map((item) => {
                const lineTotal = Math.round((Number(item.requestedQty) * Number(item.unitCost)) * 100) / 100;
                calculatedSubtotal += lineTotal;
                return {
                    productId: Number(item.productId),
                    sku: item.sku,
                    productName: item.productName,
                    requestedQty: Number(item.requestedQty),
                    unitCost: Number(item.unitCost),
                    lineTotal
                };
            });
            calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
            const calculatedVat = isVatApplied ? Math.round((calculatedSubtotal * Number(vatRate)) * 100) / 100 : 0;
            const calculatedGrandTotal = Math.round((calculatedSubtotal + calculatedVat) * 100) / 100;
            return await tx.purchaseOrder.create({
                data: {
                    poNumber,
                    company,
                    osReference,
                    status: 'Generated',
                    subtotal: calculatedSubtotal,
                    vatApplied: isVatApplied,
                    vatRate: Number(vatRate),
                    vatAmount: calculatedVat,
                    grandTotal: calculatedGrandTotal,
                    createdBy: user,
                    supplierId: supplierId || null,
                    items: { create: cleanItems }
                },
                include: { items: true }
            });
        });
    }
    async listPurchaseOrders(company) {
        if (!company)
            throw new common_1.BadRequestException('Company is required.');
        const pos = await this.prisma.purchaseOrder.findMany({
            where: { company },
            include: {
                items: true,
                supplier: true
            },
            orderBy: { createdAt: 'desc' },
        });
        return pos.map(po => ({
            ...po,
            supplierName: po.supplier ? po.supplier.legalName : null
        }));
    }
    async receivePurchaseOrder(id, data) {
        const { user, verifications } = data;
        return await this.prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
            if (!po)
                throw new common_1.NotFoundException('P.O. not found.');
            if (po.status === 'Cancelled')
                throw new common_1.BadRequestException('Cannot receive a cancelled P.O.');
            let hasShortage = false;
            for (const v of verifications) {
                const item = po.items.find(i => i.id === v.itemId);
                if (!item)
                    continue;
                const requested = item.requestedQty;
                const confirmed = Math.max(0, Number(v.confirmedQty) || 0);
                const shortage = Math.max(0, requested - confirmed);
                await tx.purchaseOrderItem.update({
                    where: { id: item.id },
                    data: { confirmedQty: confirmed, shortageQty: shortage }
                });
                if (shortage > 0) {
                    hasShortage = true;
                    await tx.shortage.create({
                        data: {
                            company: po.company,
                            poNumber: po.poNumber,
                            purchaseOrderId: po.id,
                            purchaseOrderItemId: item.id,
                            sku: item.sku,
                            productName: item.productName,
                            requestedQty: requested,
                            confirmedQty: confirmed,
                            shortageQty: shortage,
                            status: 'Pending Purchase',
                            createdBy: user
                        }
                    });
                }
            }
            const newStatus = hasShortage ? 'Partially Received' : 'Received';
            return await tx.purchaseOrder.update({
                where: { id },
                data: { status: newStatus, updatedBy: user, receivedAt: new Date() },
                include: { items: true }
            });
        });
    }
    async updateSupplierCatalog(id, data) {
        const supplier = await this.prisma.supplier.findUnique({ where: { id } });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found.');
        return await this.prisma.supplier.update({
            where: { id },
            data: { catalog: data.catalog }
        });
    }
    async updatePurchaseOrderStatus(id, data) {
        const existing = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('P.O. not found.');
        return await this.prisma.purchaseOrder.update({
            where: { id },
            data: { status: data.status, updatedBy: data.user }
        });
    }
    async cancelPurchaseOrder(id, user) {
        return this.prisma.$transaction(async (tx) => {
            const existing = await tx.purchaseOrder.findUnique({ where: { id } });
            if (!existing)
                throw new common_1.NotFoundException('P.O. not found.');
            await tx.shortage.updateMany({
                where: { purchaseOrderId: id, status: { notIn: ['Fulfilled', 'Cancelled'] } },
                data: { status: 'Cancelled', updatedBy: user },
            });
            return tx.purchaseOrder.update({ where: { id }, data: { status: 'Cancelled', updatedBy: user } });
        });
    }
    async hardDeletePurchaseOrder(id) {
        return this.prisma.purchaseOrder.delete({ where: { id } });
    }
};
exports.ProcurementController = ProcurementController;
__decorate([
    (0, common_1.Post)('suppliers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)('suppliers'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "listSuppliers", null);
__decorate([
    (0, common_1.Patch)('suppliers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "updateSupplier", null);
__decorate([
    (0, common_1.Delete)('suppliers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "deleteSupplier", null);
__decorate([
    (0, common_1.Get)('purchase-orders/next-po-number'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "getNextPoNumber", null);
__decorate([
    (0, common_1.Post)('purchase-orders'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "createPurchaseOrder", null);
__decorate([
    (0, common_1.Get)('purchase-orders'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "listPurchaseOrders", null);
__decorate([
    (0, common_1.Post)('purchase-orders/:id/receive'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "receivePurchaseOrder", null);
__decorate([
    (0, common_1.Patch)('suppliers/:id/catalog'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "updateSupplierCatalog", null);
__decorate([
    (0, common_1.Patch)('purchase-orders/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "updatePurchaseOrderStatus", null);
__decorate([
    (0, common_1.Delete)('purchase-orders/:id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('user')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "cancelPurchaseOrder", null);
__decorate([
    (0, common_1.Delete)('purchase-orders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProcurementController.prototype, "hardDeletePurchaseOrder", null);
exports.ProcurementController = ProcurementController = __decorate([
    (0, common_1.Controller)('procurement')
], ProcurementController);
//# sourceMappingURL=purchase-orders.controller.js.map