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
exports.SalesController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let SalesController = class SalesController {
    async getCustomers(company, search, page = '1', limit = '10') {
        if (!company)
            return { data: [], total: 0, page: 1, totalPages: 0 };
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;
        const whereClause = { company };
        if (search && search.trim() !== '') {
            const searchTerm = search.trim();
            whereClause.OR = [
                { name: { contains: searchTerm, mode: 'insensitive' } },
                { company: { contains: searchTerm, mode: 'insensitive' } },
                { id: { contains: searchTerm, mode: 'insensitive' } },
                { contact: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } }
            ];
        }
        const [customers, total] = await Promise.all([
            prisma.customer.findMany({
                where: whereClause,
                skip,
                take: limitNum,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.customer.count({ where: whereClause })
        ]);
        return {
            data: customers,
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        };
    }
    async createCustomer(data) {
        return prisma.customer.create({ data });
    }
    async updateCustomer(id, data) {
        return prisma.customer.update({ where: { id }, data });
    }
    async updateCustomerBalance(id, amount) {
        return prisma.customer.update({
            where: { id },
            data: { balance: { increment: amount } }
        });
    }
};
exports.SalesController = SalesController;
__decorate([
    (0, common_1.Get)('customers'),
    __param(0, (0, common_1.Query)('company')),
    __param(1, (0, common_1.Query)('search')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Post)('customers'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "createCustomer", null);
__decorate([
    (0, common_1.Patch)('customers/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "updateCustomer", null);
__decorate([
    (0, common_1.Patch)('customers/:id/balance'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('amount')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], SalesController.prototype, "updateCustomerBalance", null);
exports.SalesController = SalesController = __decorate([
    (0, common_1.Controller)('sales')
], SalesController);
//# sourceMappingURL=sales.controller.js.map