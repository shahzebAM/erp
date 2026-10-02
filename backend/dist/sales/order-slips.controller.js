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
exports.OrderSlipsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let OrderSlipsController = class OrderSlipsController {
    prisma = new client_1.PrismaClient();
    async searchCustomers(company, q) {
        if (!company || !q || q.length < 2)
            return [];
        const searchString = q.toLowerCase();
        const allCompanyCustomers = await this.prisma.customer.findMany({
            where: { company },
            select: { id: true, name: true, email: true, phone: true }
        });
        return allCompanyCustomers.filter(c => (c.name && c.name.toLowerCase().includes(searchString))).slice(0, 15);
    }
    async searchProducts(company, q) {
        if (!company || !q || q.length < 2)
            return [];
        const searchString = q.toLowerCase();
        const allCompanyProducts = await this.prisma.product.findMany({
            where: { company },
            select: { id: true, sku: true, name: true, category: true, sellingPrice: true, currentStock: true }
        });
        const products = allCompanyProducts.filter(p => (p.name && p.name.toLowerCase().includes(searchString)) ||
            (p.sku && p.sku.toLowerCase().includes(searchString)) ||
            (p.category && p.category.toLowerCase().includes(searchString))).slice(0, 15);
        if (products.length === 0)
            return [];
        const productIds = products.map(p => p.id);
        const [hubStocks, allWarehouses] = await Promise.all([
            this.prisma.warehouseStock.findMany({ where: { company, productId: { in: productIds } } }),
            this.prisma.warehouse.findMany({ where: { company } })
        ]);
        const whMap = new Map(allWarehouses.map(w => [String(w.id), w.name]));
        return products.map(p => {
            const productStocks = hubStocks.filter(h => h.productId === p.id);
            const warehouseQty = productStocks.reduce((sum, h) => sum + h.quantity, 0);
            const warehouseBreakdown = productStocks
                .filter(h => h.quantity > 0)
                .map(h => ({ name: whMap.get(String(h.warehouseId)) || `Depot ${h.warehouseId}`, quantity: h.quantity }));
            return { ...p, officeStock: p.currentStock || 0, warehouseQty, warehouseBreakdown };
        });
    }
    async refreshStock(data) {
        const { company, productIds } = data;
        if (!company || !productIds || productIds.length === 0)
            return {};
        const [dbProducts, hubStocks, allWarehouses] = await Promise.all([
            this.prisma.product.findMany({ where: { company, id: { in: productIds } } }),
            this.prisma.warehouseStock.findMany({ where: { company, productId: { in: productIds } } }),
            this.prisma.warehouse.findMany({ where: { company } })
        ]);
        const whMap = new Map(allWarehouses.map(w => [String(w.id), w.name]));
        const stockMap = {};
        productIds.forEach(id => stockMap[id] = { officeStock: 0, warehouseQty: 0, warehouseBreakdown: [] });
        dbProducts.forEach(p => { stockMap[p.id].officeStock = p.currentStock || 0; });
        hubStocks.forEach(h => {
            stockMap[h.productId].warehouseQty += h.quantity;
            if (h.quantity > 0) {
                stockMap[h.productId].warehouseBreakdown.push({ name: whMap.get(String(h.warehouseId)) || `Depot ${h.warehouseId}`, quantity: h.quantity });
            }
        });
        return stockMap;
    }
    async getShortages(company) {
        if (!company)
            throw new common_1.BadRequestException("Company is required");
        return await this.prisma.shortage.findMany({
            where: { company },
            include: { orderSlip: { include: { customer: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }
    async updateShortageStatus(id, body) {
        return await this.prisma.shortage.update({ where: { id }, data: { status: body.status } });
    }
    async createOrderSlip(data) {
        const { company, customerId, items, isVatApplied, vatRate = 0.12, user, osNumber: customOsNumber, referenceOs } = data;
        if (!company || !customerId || !items || items.length === 0)
            throw new common_1.BadRequestException('Missing required fields.');
        return await this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { id: customerId } });
            if (!customer)
                throw new common_1.NotFoundException('Customer record not found.');
            let osNumber = customOsNumber?.trim();
            if (osNumber) {
                const existing = await tx.orderSlip.findFirst({ where: { company, osNumber } });
                if (existing)
                    throw new common_1.BadRequestException(`Order Slip number ${osNumber} is already in use!`);
            }
            else {
                const lastOs = await tx.orderSlip.findFirst({ where: { company }, orderBy: { osNumber: 'desc' } });
                let nextNum = 1;
                if (lastOs && lastOs.osNumber.startsWith('OS-')) {
                    const lastNum = parseInt(lastOs.osNumber.replace('OS-', ''), 10);
                    if (!isNaN(lastNum))
                        nextNum = lastNum + 1;
                }
                osNumber = `OS-${String(nextNum).padStart(6, '0')}`;
            }
            const productIds = items.map((i) => Number(i.productId));
            const dbProducts = await tx.product.findMany({ where: { id: { in: productIds }, company } });
            let calculatedSubtotal = 0;
            const cleanItems = [];
            for (const item of items) {
                const requestedQty = Number(item.requestedQty);
                if (!item.productId || !requestedQty || requestedQty <= 0)
                    throw new common_1.BadRequestException(`Invalid quantity for SKU: ${item.sku}`);
                const product = dbProducts.find(p => p.id === Number(item.productId));
                if (!product)
                    throw new common_1.NotFoundException(`Product not found: ${item.sku}`);
                const unitPrice = Number(item.unitPrice) || Number(product.sellingPrice);
                const lineTotal = Math.round((requestedQty * unitPrice) * 100) / 100;
                calculatedSubtotal += lineTotal;
                cleanItems.push({ productId: product.id, sku: product.sku, productName: product.name, requestedQty, unitPrice, lineTotal });
            }
            calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
            const calculatedVat = isVatApplied ? Math.round((calculatedSubtotal * Number(vatRate)) * 100) / 100 : 0;
            const calculatedGrandTotal = Math.round((calculatedSubtotal + calculatedVat) * 100) / 100;
            const newOs = await tx.orderSlip.create({
                data: {
                    osNumber, referenceOs: referenceOs || null, company, customerId, status: 'Generated',
                    subtotal: calculatedSubtotal, vatApplied: isVatApplied, vatRate: Number(vatRate), vatAmount: calculatedVat, grandTotal: calculatedGrandTotal, createdBy: user,
                    items: { create: cleanItems }
                },
                include: { items: { include: { product: { select: { currentStock: true } } } }, customer: true }
            });
            if (osNumber.startsWith('FO')) {
                for (const item of cleanItems) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { currentStock: { decrement: item.requestedQty } }
                    });
                }
            }
            return { ...newOs, items: newOs.items.map((i) => ({ ...i, officeStock: i.product?.currentStock || 0 })) };
        });
    }
    async listOrderSlips(company, pageStr, limitStr, search, status, startDate, endDate) {
        if (!company)
            throw new common_1.BadRequestException('Company is required.');
        const page = Math.max(1, parseInt(pageStr) || 1);
        const limit = Math.max(1, parseInt(limitStr) || 15);
        const skip = (page - 1) * limit;
        const whereClause = { company };
        if (status && status !== 'All')
            whereClause.status = status;
        if (search) {
            whereClause.OR = [
                { osNumber: { contains: search, mode: 'insensitive' } }, { referenceOs: { contains: search, mode: 'insensitive' } },
                { customerId: { contains: search, mode: 'insensitive' } }, { createdBy: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.createdAt = { gte: start, lte: end };
        }
        const [data, total] = await Promise.all([
            this.prisma.orderSlip.findMany({ where: whereClause, include: { customer: { select: { name: true, id: true } }, items: { include: { product: { select: { currentStock: true } } } } }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
            this.prisma.orderSlip.count({ where: whereClause })
        ]);
        const formattedData = data.map((os) => ({ ...os, items: os.items.map((i) => ({ ...i, officeStock: i.product?.currentStock || 0 })) }));
        return { data: formattedData, total, page, totalPages: Math.ceil(total / limit) };
    }
    async getOrderSlip(id) {
        const os = await this.prisma.orderSlip.findUnique({ where: { id }, include: { items: { include: { product: { select: { currentStock: true } } } }, customer: true } });
        if (!os)
            throw new common_1.NotFoundException('Order Slip not found.');
        return { ...os, items: os.items.map((i) => ({ ...i, officeStock: i.product?.currentStock || 0 })) };
    }
    async processOrderSlip(id, body) {
        const { items, user } = body;
        return await this.prisma.$transaction(async (tx) => {
            const os = await tx.orderSlip.findUnique({ where: { id }, include: { items: true } });
            if (!os)
                throw new common_1.NotFoundException('Order Slip not found');
            let hasShortage = false;
            for (const input of items) {
                const osItem = os.items.find((i) => i.id === input.id);
                if (!osItem)
                    continue;
                const requestedQty = osItem.requestedQty;
                const physicalQty = Number(input.physicalQty) || 0;
                const shortageQty = Math.max(0, requestedQty - physicalQty);
                if (shortageQty > 0)
                    hasShortage = true;
                await tx.orderSlipItem.update({ where: { id: osItem.id }, data: { confirmedQty: physicalQty, shortageQty } });
                if (shortageQty > 0) {
                    await tx.shortage.create({ data: { orderSlipId: os.id, orderSlipItemId: osItem.id, company: os.company, customerId: os.customerId, osNumber: os.osNumber, sku: osItem.sku, productName: osItem.productName, requestedQty: requestedQty, confirmedQty: physicalQty, shortageQty: shortageQty, status: 'Open', createdBy: user } });
                }
            }
            await tx.orderSlip.update({ where: { id }, data: { status: hasShortage ? 'Partially Verified' : 'Verified', processedAt: new Date() } });
            return { success: true };
        });
    }
    async updateOrderSlip(id, data) {
        const { status, user, items, isVatApplied, vatRate = 0.12, customerId, referenceOs } = data;
        const existing = await this.prisma.orderSlip.findUnique({ where: { id }, include: { items: true } });
        if (!existing)
            throw new common_1.NotFoundException('Order Slip not found.');
        if (existing.status === 'Cancelled')
            throw new common_1.BadRequestException('Cannot modify a cancelled Order Slip.');
        return await this.prisma.$transaction(async (tx) => {
            if (existing.osNumber.startsWith('OS') && (status === 'Cancelled' || status === 'Returned')) {
                const activeFo = await tx.orderSlip.findFirst({ where: { referenceOs: existing.osNumber, status: { notIn: ['Cancelled', 'Returned'] } } });
                if (activeFo)
                    throw new common_1.BadRequestException(`Cannot cancel OS. An active Final Order (${activeFo.osNumber}) exists. Cancel the Final Order first.`);
            }
            if (existing.osNumber.startsWith('FO') && (status === 'Cancelled' || status === 'Returned') && existing.status !== 'Cancelled' && existing.status !== 'Returned') {
                for (const item of existing.items) {
                    await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.requestedQty } } });
                }
            }
            if (items && Array.isArray(items)) {
                if (existing.osNumber.startsWith('FO') && status !== 'Cancelled' && status !== 'Returned') {
                    for (const oldItem of existing.items) {
                        await tx.product.update({ where: { id: oldItem.productId }, data: { currentStock: { increment: oldItem.requestedQty } } });
                    }
                }
                await tx.orderSlipItem.deleteMany({ where: { orderSlipId: id } });
                const productIds = items.map((i) => Number(i.productId));
                const dbProducts = await tx.product.findMany({ where: { id: { in: productIds }, company: existing.company } });
                let calculatedSubtotal = 0;
                const cleanItems = [];
                for (const item of items) {
                    const requestedQty = Number(item.requestedQty);
                    if (!item.productId || !requestedQty || requestedQty <= 0)
                        continue;
                    const product = dbProducts.find(p => p.id === Number(item.productId));
                    if (!product)
                        continue;
                    const unitPrice = Number(item.unitPrice) || Number(product.sellingPrice);
                    const lineTotal = Math.round((requestedQty * unitPrice) * 100) / 100;
                    calculatedSubtotal += lineTotal;
                    cleanItems.push({ productId: product.id, sku: product.sku, productName: product.name, requestedQty, unitPrice, lineTotal });
                }
                if (existing.osNumber.startsWith('FO') && status !== 'Cancelled' && status !== 'Returned') {
                    for (const newItem of cleanItems) {
                        await tx.product.update({ where: { id: newItem.productId }, data: { currentStock: { decrement: newItem.requestedQty } } });
                    }
                }
                calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;
                const applyVat = isVatApplied !== undefined ? isVatApplied : existing.vatApplied;
                const calculatedVat = applyVat ? Math.round((calculatedSubtotal * Number(vatRate)) * 100) / 100 : 0;
                const calculatedGrandTotal = Math.round((calculatedSubtotal + calculatedVat) * 100) / 100;
                const updatedOs = await tx.orderSlip.update({
                    where: { id },
                    data: {
                        status: status || existing.status, referenceOs: referenceOs !== undefined ? referenceOs : existing.referenceOs, customerId: customerId || existing.customerId, updatedBy: user,
                        subtotal: calculatedSubtotal, vatApplied: applyVat, vatAmount: calculatedVat, grandTotal: calculatedGrandTotal,
                        items: { create: cleanItems }
                    },
                    include: { items: { include: { product: { select: { currentStock: true } } } }, customer: true }
                });
                return { ...updatedOs, items: updatedOs.items.map((i) => ({ ...i, officeStock: i.product?.currentStock || 0 })) };
            }
            const updatedStatusOs = await tx.orderSlip.update({
                where: { id },
                data: { status, referenceOs: referenceOs !== undefined ? referenceOs : existing.referenceOs, customerId: customerId || existing.customerId, updatedBy: user },
                include: { items: { include: { product: { select: { currentStock: true } } } }, customer: true }
            });
            return { ...updatedStatusOs, items: updatedStatusOs.items.map((i) => ({ ...i, officeStock: i.product?.currentStock || 0 })) };
        });
    }
    async cancelOrderSlip(id, user) {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.orderSlip.findUnique({ where: { id }, include: { items: true } });
            if (!existing)
                throw new common_1.NotFoundException('Order Slip not found.');
            if (existing.status === 'Cancelled')
                return existing;
            if (existing.osNumber.startsWith('OS')) {
                const activeFo = await tx.orderSlip.findFirst({ where: { referenceOs: existing.osNumber, status: { notIn: ['Cancelled', 'Returned'] } } });
                if (activeFo)
                    throw new common_1.BadRequestException(`Cannot cancel OS. An active Final Order (${activeFo.osNumber}) exists. Cancel the Final Order first.`);
            }
            if (existing.osNumber.startsWith('FO')) {
                for (const item of existing.items) {
                    await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.requestedQty } } });
                }
            }
            return await tx.orderSlip.update({ where: { id }, data: { status: 'Cancelled', updatedBy: user } });
        });
    }
    async hardDeleteOrderSlip(id) {
        return await this.prisma.$transaction(async (tx) => {
            const existing = await tx.orderSlip.findUnique({ where: { id }, include: { items: true } });
            if (!existing)
                throw new common_1.NotFoundException('Order Slip not found.');
            if (existing.osNumber.startsWith('OS')) {
                const linkedFo = await tx.orderSlip.findFirst({ where: { referenceOs: existing.osNumber } });
                if (linkedFo)
                    throw new common_1.BadRequestException(`Cannot delete OS. A Final Order (${linkedFo.osNumber}) is tied to it. Delete the Final Order first.`);
            }
            if (existing.osNumber.startsWith('FO') && existing.status !== 'Cancelled' && existing.status !== 'Returned') {
                for (const item of existing.items) {
                    await tx.product.update({ where: { id: item.productId }, data: { currentStock: { increment: item.requestedQty } } });
                }
            }
            await tx.orderSlipItem.deleteMany({ where: { orderSlipId: id } });
            return await tx.orderSlip.delete({ where: { id } });
        });
    }
};
exports.OrderSlipsController = OrderSlipsController;
__decorate([
    (0, common_1.Get)('search-customers'),
    __param(0, (0, common_1.Query)('company')),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "searchCustomers", null);
__decorate([
    (0, common_1.Get)('search-products'),
    __param(0, (0, common_1.Query)('company')),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "searchProducts", null);
__decorate([
    (0, common_1.Post)('refresh-stock'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "refreshStock", null);
__decorate([
    (0, common_1.Get)('shortages/all'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "getShortages", null);
__decorate([
    (0, common_1.Patch)('shortages/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "updateShortageStatus", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "createOrderSlip", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('company')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('search')),
    __param(4, (0, common_1.Query)('status')),
    __param(5, (0, common_1.Query)('startDate')),
    __param(6, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "listOrderSlips", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "getOrderSlip", null);
__decorate([
    (0, common_1.Patch)(':id/process'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "processOrderSlip", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "updateOrderSlip", null);
__decorate([
    (0, common_1.Delete)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('user')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "cancelOrderSlip", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrderSlipsController.prototype, "hardDeleteOrderSlip", null);
exports.OrderSlipsController = OrderSlipsController = __decorate([
    (0, common_1.Controller)('sales/order-slips')
], OrderSlipsController);
//# sourceMappingURL=order-slips.controller.js.map