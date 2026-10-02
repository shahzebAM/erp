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
var DriveService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriveService = void 0;
const common_1 = require("@nestjs/common");
const googleapis_1 = require("googleapis");
const stream_1 = require("stream");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
let DriveService = DriveService_1 = class DriveService {
    logger = new common_1.Logger(DriveService_1.name);
    drive;
    constructor() {
        const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID?.trim(), process.env.GOOGLE_CLIENT_SECRET?.trim(), 'https://developers.google.com/oauthplayground');
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN?.trim(),
        });
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2Client });
    }
    async getOrCreateCompanyFolder(companyName) {
        const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
        if (!rootFolderId)
            throw new common_1.HttpException("Missing GOOGLE_DRIVE_FOLDER_ID in .env", common_1.HttpStatus.BAD_REQUEST);
        const query = `name = '${companyName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        try {
            const searchRes = await this.drive.files.list({
                q: query,
                fields: 'files(id, name)',
                spaces: 'drive',
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
            });
            if (searchRes.data.files && searchRes.data.files.length > 0) {
                return searchRes.data.files[0].id;
            }
            this.logger.log(`Creating root folder for ${companyName}...`);
            const createRes = await this.drive.files.create({
                requestBody: {
                    name: companyName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [rootFolderId],
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            return createRes.data.id;
        }
        catch (error) {
            const actualError = error.response?.data?.error?.message || error.message;
            this.logger.error(`Folder Creation Failed: ${actualError}`);
            throw new common_1.HttpException(actualError, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getCompanyDirectory(companyName) {
        const companyFolderId = await this.getOrCreateCompanyFolder(companyName);
        const folders = [];
        const files = [];
        const pendingFolderIds = [companyFolderId];
        const seenIds = new Set([companyFolderId]);
        for (let index = 0; index < pendingFolderIds.length; index += 1) {
            const parentId = pendingFolderIds[index];
            let pageToken;
            do {
                const response = await this.drive.files.list({
                    q: `'${parentId}' in parents and trashed = false`,
                    fields: 'nextPageToken,incompleteSearch,files(id,name,mimeType,webViewLink,createdTime,size,parents)',
                    spaces: 'drive',
                    pageSize: 1000,
                    pageToken,
                    includeItemsFromAllDrives: true,
                    supportsAllDrives: true,
                });
                if (response.data.incompleteSearch) {
                    throw new common_1.HttpException('Google Drive returned an incomplete directory. Please retry.', common_1.HttpStatus.BAD_GATEWAY);
                }
                for (const item of response.data.files || []) {
                    if (!item.id || seenIds.has(item.id))
                        continue;
                    seenIds.add(item.id);
                    if (item.mimeType === 'application/vnd.google-apps.folder') {
                        folders.push(item);
                        pendingFolderIds.push(item.id);
                    }
                    else {
                        files.push(item);
                    }
                }
                pageToken = response.data.nextPageToken || undefined;
            } while (pageToken);
        }
        return { companyFolderId, folders, files };
    }
    async createSubFolder(companyName, folderName, parentFolderId) {
        const parentId = parentFolderId || await this.getOrCreateCompanyFolder(companyName);
        const createRes = await this.drive.files.create({
            requestBody: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            },
            fields: 'id, name',
            supportsAllDrives: true,
        });
        return createRes.data;
    }
    async uploadFileToDrive(fileBuffer, mimeType, originalName, company, targetFolderId) {
        try {
            const destinationFolderId = targetFolderId || (await this.getOrCreateCompanyFolder(company));
            const fileMetadata = {
                name: originalName,
                parents: [destinationFolderId],
            };
            const media = {
                mimeType: mimeType,
                body: stream_1.Readable.from(fileBuffer),
            };
            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink',
                supportsAllDrives: true,
            });
            return response.data.webViewLink;
        }
        catch (error) {
            const actualError = error.response?.data?.error?.message || error.message;
            this.logger.error(`Google Drive Upload Failed: ${actualError}`);
            throw new common_1.HttpException(actualError, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async deleteFile(fileId) {
        try {
            await this.drive.files.delete({
                fileId,
                supportsAllDrives: true
            });
        }
        catch (error) {
            this.logger.warn(`Could not delete file ${fileId} from Drive: ${error.message}`);
        }
    }
    async renameFolder(folderId, newName) {
        try {
            const response = await this.drive.files.update({
                fileId: folderId,
                requestBody: {
                    name: newName,
                },
                fields: 'id, name',
                supportsAllDrives: true,
            });
            return response.data;
        }
        catch (error) {
            const actualError = error.response?.data?.error?.message || error.message;
            this.logger.error(`Folder Rename Failed: ${actualError}`);
            throw new common_1.HttpException(actualError, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getStorageQuota() {
        try {
            const aboutRes = await this.drive.about.get({ fields: 'storageQuota' });
            return {
                usage: aboutRes.data.storageQuota?.usage || '0',
                limit: aboutRes.data.storageQuota?.limit || '0',
            };
        }
        catch (error) {
            this.logger.warn(`Could not fetch storage quota: ${error.message}`);
            return null;
        }
    }
};
exports.DriveService = DriveService;
exports.DriveService = DriveService = DriveService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DriveService);
//# sourceMappingURL=drive.service.js.map