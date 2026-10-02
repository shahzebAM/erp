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
exports.DocumentController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const document_service_1 = require("./document.service");
const drive_service_1 = require("./drive.service");
let DocumentController = class DocumentController {
    documentService;
    driveService;
    constructor(documentService, driveService) {
        this.documentService = documentService;
        this.driveService = driveService;
    }
    async getDirectory(company) {
        if (!company)
            throw new common_1.BadRequestException('Company header missing');
        const directoryData = await this.documentService.getCompanyDirectory(company);
        const storageQuota = await this.driveService.getStorageQuota();
        return {
            ...directoryData,
            storageQuota
        };
    }
    async createFolder(company, body) {
        if (!company || !body.folderName) {
            throw new common_1.BadRequestException('Company and Folder Name are required');
        }
        const targetId = body.targetFolderId || body.parentFolderId;
        return this.driveService.createSubFolder(company, body.folderName, targetId);
    }
    async renameFolder(id, body) {
        if (!body.newName || body.newName.trim() === '') {
            throw new common_1.BadRequestException('New folder name is required.');
        }
        return this.driveService.renameFolder(id, body.newName);
    }
    async uploadFile(file, company, username, targetFolderId) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        return this.documentService.processNewDocument(file, company, username, targetFolderId);
    }
    async search(query, targetModel, company, username) {
        if (!query)
            throw new common_1.BadRequestException('Query cannot be empty');
        return this.documentService.searchDocuments(query, company, username, targetModel);
    }
    async deleteDocument(id) {
        return this.documentService.deleteDocument(id);
    }
};
exports.DocumentController = DocumentController;
__decorate([
    (0, common_1.Get)('directory'),
    __param(0, (0, common_1.Headers)('x-company')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "getDirectory", null);
__decorate([
    (0, common_1.Post)('folder'),
    __param(0, (0, common_1.Headers)('x-company')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "createFolder", null);
__decorate([
    (0, common_1.Patch)('folder/:id/rename'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "renameFolder", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Headers)('x-company')),
    __param(2, (0, common_1.Headers)('x-username')),
    __param(3, (0, common_1.Body)('targetFolderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "uploadFile", null);
__decorate([
    (0, common_1.Post)('search'),
    __param(0, (0, common_1.Body)('query')),
    __param(1, (0, common_1.Body)('model')),
    __param(2, (0, common_1.Headers)('x-company')),
    __param(3, (0, common_1.Headers)('x-username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "search", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DocumentController.prototype, "deleteDocument", null);
exports.DocumentController = DocumentController = __decorate([
    (0, common_1.Controller)('api/docs'),
    __metadata("design:paramtypes", [document_service_1.DocumentService,
        drive_service_1.DriveService])
], DocumentController);
//# sourceMappingURL=document.controller.js.map