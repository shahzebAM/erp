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
var DocumentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const gemini_service_1 = require("./gemini.service");
const drive_service_1 = require("./drive.service");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const prisma = new client_1.PrismaClient();
let DocumentService = DocumentService_1 = class DocumentService {
    geminiService;
    driveService;
    logger = new common_1.Logger(DocumentService_1.name);
    companyCache = new Map();
    constructor(geminiService, driveService) {
        this.geminiService = geminiService;
        this.driveService = driveService;
    }
    async getCompanyDirectory(company) {
        return this.driveService.getCompanyDirectory(company);
    }
    async createFolder(company, folderName) {
        return this.driveService.createSubFolder(company, folderName);
    }
    async processNewDocument(file, company, username, targetFolderId) {
        const tempFilePath = path.join(os.tmpdir(), `${Date.now()}-${file.originalname}`);
        fs.writeFileSync(tempFilePath, file.buffer);
        let driveLink;
        let geminiData;
        try {
            const [driveResponse, geminiResponse] = await Promise.all([
                this.driveService.uploadFileToDrive(file.buffer, file.mimetype, file.originalname, company, targetFolderId),
                this.geminiService.uploadFileToGemini(tempFilePath, file.mimetype, file.originalname)
            ]);
            driveLink = driveResponse;
            geminiData = geminiResponse;
        }
        catch (error) {
            this.logger.error(`Upload Process Failed: ${error.message}`);
            throw new common_1.BadRequestException(`Upload failed: ${error.message}`);
        }
        finally {
            if (fs.existsSync(tempFilePath))
                fs.unlinkSync(tempFilePath);
        }
        const doc = await prisma.document.create({
            data: {
                filename: file.originalname,
                originalName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                company: company,
                geminiFileUri: geminiData.fileUri,
                geminiFileId: geminiData.fileId,
                googleDriveLink: driveLink,
                status: 'ACTIVE',
                uploadedBy: username,
            },
        });
        this.companyCache.delete(company);
        return doc;
    }
    async searchDocuments(query, company, username, requestedModel) {
        try {
            const docs = await prisma.document.findMany({
                where: { company, status: 'ACTIVE' },
            });
            if (!docs || docs.length === 0) {
                throw new Error(`No active documents found for ${company}.`);
            }
            const filesData = docs
                .filter((d) => typeof d.geminiFileUri === 'string' && d.geminiFileUri.length > 0)
                .map((d) => ({
                uri: d.geminiFileUri,
                mimeType: d.mimeType || 'application/pdf',
                name: d.filename || 'Unknown Document',
                driveLink: d.googleDriveLink || 'No link available',
            }));
            if (filesData.length === 0) {
                throw new Error('Documents exist, but have not finished indexing in Gemini.');
            }
            const targetModel = requestedModel || 'gemini-1.5-flash';
            let cacheName = null;
            let cacheInfo = this.companyCache.get(company);
            if (!cacheInfo || Date.now() > cacheInfo.expiresAt || cacheInfo.model !== targetModel) {
                this.logger.log(`Generating Context Cache for ${company} using ${targetModel}...`);
                const newCacheName = await this.geminiService.createDocumentCache(filesData, targetModel);
                if (newCacheName) {
                    cacheInfo = { cacheName: newCacheName, expiresAt: Date.now() + (55 * 60 * 1000), model: targetModel };
                    this.companyCache.set(company, cacheInfo);
                    cacheName = newCacheName;
                }
            }
            else {
                cacheName = cacheInfo.cacheName;
            }
            const answer = await this.geminiService.askQuestion(query, filesData, cacheName, targetModel);
            const responseText = answer.text || 'No response generated.';
            try {
                await prisma.searchHistory.create({
                    data: {
                        username: username || 'Anonymous',
                        company: company,
                        query: query,
                        response: responseText,
                        modelUsed: targetModel,
                        promptTokens: answer.usage?.promptTokenCount || 0,
                        completionTokens: answer.usage?.candidatesTokenCount || 0,
                    },
                });
            }
            catch (dbError) {
                this.logger.warn('SearchHistory table not found in Prisma Schema. Skipping database logging.');
            }
            return { answer: responseText, model: targetModel, sourcesSearched: filesData.length, cached: !!cacheName };
        }
        catch (error) {
            this.logger.error(`Search Request Failed: ${error.message}`);
            throw new common_1.BadRequestException(error.message);
        }
    }
    async deleteDocument(driveId) {
        try {
            await this.driveService.deleteFile(driveId);
        }
        catch (e) {
            this.logger.warn(`Drive file inaccessible or already deleted.`);
        }
        const docs = await prisma.document.findMany({
            where: {
                googleDriveLink: { contains: driveId }
            }
        });
        if (docs && docs.length > 0) {
            const doc = docs[0];
            if (doc.geminiFileId) {
                try {
                    await this.geminiService.deleteGeminiFile(doc.geminiFileId);
                }
                catch (e) {
                    this.logger.warn(`Gemini file inaccessible`);
                }
            }
            await prisma.document.delete({ where: { id: doc.id } });
        }
        return { success: true, message: 'Item permanently deleted from Drive, Gemini, and Database' };
    }
};
exports.DocumentService = DocumentService;
exports.DocumentService = DocumentService = DocumentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [gemini_service_1.GeminiService,
        drive_service_1.DriveService])
], DocumentService);
//# sourceMappingURL=document.service.js.map