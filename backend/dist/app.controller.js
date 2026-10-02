"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
let AppController = class AppController {
    appService;
    constructor(appService) {
        this.appService = appService;
    }
    getHello() {
        return this.appService.getHello();
    }
    async setupAdmin(body) {
        const { username, password } = body;
        const existingAdmin = await prisma.admin.findFirst();
        if (existingAdmin) {
            throw new common_1.HttpException('An admin already exists!', common_1.HttpStatus.FORBIDDEN);
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.admin.create({
            data: {
                username,
                password: hashedPassword,
                role: 'Super Admin',
                modules: { payroll: true, ai_docs: true, inventory: true, sales: true, purchasing: true }
            }
        });
        return { message: "Setup complete!" };
    }
    async login(body) {
        const { username, password } = body;
        const admins = await prisma.admin.findMany();
        const admin = admins.find(a => a.username.toLowerCase() === username.toLowerCase());
        if (!admin) {
            throw new common_1.UnauthorizedException('Access Denied: User not found.');
        }
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Access Denied: Invalid password.');
        }
        return { message: "Login successful!" };
    }
    async getAdmins() {
        const admins = await prisma.admin.findMany();
        return admins.map(a => ({
            id: a.id,
            username: a.username,
            role: a.role || 'Admin',
            modules: a.modules || { payroll: false, ai_docs: false, inventory: false, sales: false, purchasing: false },
            moduleOrder: a.moduleOrder || [],
            status: 'Active',
            isOnline: a.isOnline || false
        }));
    }
    async createAdmin(body) {
        const { username, password, modules } = body;
        const admins = await prisma.admin.findMany();
        const existing = admins.find(a => a.username.toLowerCase() === username.toLowerCase());
        if (existing)
            throw new common_1.HttpException('Username exists', common_1.HttpStatus.FORBIDDEN);
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.admin.create({
            data: {
                username,
                password: hashedPassword,
                role: 'Admin',
                modules: modules || { payroll: false, ai_docs: false, inventory: false, sales: false, purchasing: false }
            }
        });
        return { message: "Admin created" };
    }
    async resetAdminPassword(id, body) {
        const hashedPassword = await bcrypt.hash(body.password, 10);
        await prisma.admin.update({
            where: { id },
            data: { password: hashedPassword }
        });
        return { message: "Password updated" };
    }
    async updateAdminRole(id, body) {
        const targetAdmin = await prisma.admin.findUnique({ where: { id } });
        if (!targetAdmin)
            throw new common_1.NotFoundException("Admin not found");
        if (body.role !== 'Super Admin') {
            const superAdminCount = await prisma.admin.count({ where: { role: 'Super Admin' } });
            if (targetAdmin.role === 'Super Admin' && superAdminCount <= 1) {
                throw new common_1.HttpException('System must have at least one Super Admin', common_1.HttpStatus.FORBIDDEN);
            }
        }
        await prisma.admin.update({ where: { id }, data: { role: body.role } });
        return { message: "Role updated" };
    }
    async updateAdminModules(id, body) {
        const targetAdmin = await prisma.admin.findUnique({ where: { id } });
        if (!targetAdmin)
            throw new common_1.NotFoundException("Admin not found");
        await prisma.admin.update({
            where: { id },
            data: { modules: body.modules }
        });
        return { message: "Module access updated" };
    }
    async deleteAdmin(id) {
        const targetAdmin = await prisma.admin.findUnique({ where: { id } });
        if (!targetAdmin)
            throw new common_1.NotFoundException("Admin not found");
        if (targetAdmin.role === 'Super Admin') {
            const superAdminCount = await prisma.admin.count({ where: { role: 'Super Admin' } });
            if (superAdminCount <= 1) {
                throw new common_1.HttpException('Cannot delete the last Super Admin', common_1.HttpStatus.FORBIDDEN);
            }
        }
        await prisma.admin.delete({ where: { id } });
        return { message: "Admin deleted" };
    }
    async updateAdminPreferences(id, body) {
        const { moduleOrder } = body;
        if (!moduleOrder || !Array.isArray(moduleOrder)) {
            throw new common_1.HttpException('Invalid module layout format', common_1.HttpStatus.BAD_REQUEST);
        }
        const numericId = parseInt(id, 10);
        const adminRecord = await prisma.admin.findFirst({
            where: {
                OR: [
                    { id: isNaN(numericId) ? undefined : numericId },
                    { username: id }
                ]
            }
        });
        if (!adminRecord) {
            throw new common_1.NotFoundException("Admin not found");
        }
        await prisma.admin.update({
            where: { id: adminRecord.id },
            data: { moduleOrder }
        });
        return { message: "Preferences updated successfully" };
    }
    async updateAdminStatus(id, body) {
        const targetAdmin = await prisma.admin.findUnique({ where: { id } });
        if (!targetAdmin)
            throw new common_1.NotFoundException("Admin not found");
        await prisma.admin.update({
            where: { id },
            data: { isOnline: body.isOnline }
        });
        return { message: "Online status updated" };
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Post)(['auth/setup', 'api/auth/setup', 'setup', 'api/setup']),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "setupAdmin", null);
__decorate([
    (0, common_1.Post)(['auth/login', 'api/auth/login', 'login', 'api/login']),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "login", null);
__decorate([
    (0, common_1.Get)(['admins', 'api/admins']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getAdmins", null);
__decorate([
    (0, common_1.Post)(['admins', 'api/admins']),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createAdmin", null);
__decorate([
    (0, common_1.Patch)(['admins/:id/password', 'api/admins/:id/password']),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "resetAdminPassword", null);
__decorate([
    (0, common_1.Patch)(['admins/:id/role', 'api/admins/:id/role']),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateAdminRole", null);
__decorate([
    (0, common_1.Patch)(['admins/:id/modules', 'api/admins/:id/modules']),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateAdminModules", null);
__decorate([
    (0, common_1.Delete)(['admins/:id', 'api/admins/:id']),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "deleteAdmin", null);
__decorate([
    (0, common_1.Patch)(['admins/:id/preferences', 'api/admins/:id/preferences']),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateAdminPreferences", null);
__decorate([
    (0, common_1.Patch)(['admins/:id/status', 'api/admins/:id/status']),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "updateAdminStatus", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService])
], AppController);
//# sourceMappingURL=app.controller.js.map