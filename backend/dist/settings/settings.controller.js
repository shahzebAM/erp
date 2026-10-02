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
exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let SettingsController = class SettingsController {
    async getSettings(company) {
        if (!company)
            return [];
        try {
            const settingsArray = await prisma.settings.findMany({
                where: { company: company }
            });
            return settingsArray;
        }
        catch (error) {
            console.error("GET Settings Error:", error);
            return [];
        }
    }
    async updateSettings(data) {
        if (!data.company) {
            throw new common_1.HttpException("Company is required", common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const existing = await prisma.settings.findFirst({
                where: { company: data.company }
            });
            if (existing) {
                return await prisma.settings.update({
                    where: { id: existing.id },
                    data: {
                        shiftStart: data.shiftStart,
                        shiftEnd: data.shiftEnd
                    }
                });
            }
            else {
                return await prisma.settings.create({
                    data: {
                        company: data.company,
                        shiftStart: data.shiftStart,
                        shiftEnd: data.shiftEnd
                    }
                });
            }
        }
        catch (error) {
            console.error("POST Settings Error:", error);
            throw new common_1.HttpException(`Database error: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getWarehouses(company) {
        if (!company)
            return [];
        try {
            return await prisma.warehouse.findMany({
                where: { company: company },
                orderBy: { id: 'asc' }
            });
        }
        catch (error) {
            console.error("GET Warehouses Error:", error);
            return [];
        }
    }
    async createWarehouse(data) {
        if (!data.company || !data.name || !data.address) {
            throw new common_1.HttpException("Missing required fields", common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            return await prisma.warehouse.create({
                data: {
                    company: data.company,
                    name: data.name,
                    address: data.address,
                    status: data.status || 'Active'
                }
            });
        }
        catch (error) {
            console.error("POST Warehouse Error:", error);
            throw new common_1.HttpException(`Database error: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async updateWarehouseStatus(id, data) {
        try {
            return await prisma.warehouse.update({
                where: { id: parseInt(id) },
                data: { status: data.status }
            });
        }
        catch (error) {
            console.error("PATCH Warehouse Error:", error);
            throw new common_1.HttpException(`Database error: ${error.message}`, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('warehouses'),
    __param(0, (0, common_1.Query)('company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "getWarehouses", null);
__decorate([
    (0, common_1.Post)('warehouses'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "createWarehouse", null);
__decorate([
    (0, common_1.Patch)('warehouses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "updateWarehouseStatus", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)('settings')
], SettingsController);
//# sourceMappingURL=settings.controller.js.map