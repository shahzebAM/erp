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
var GeminiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const common_1 = require("@nestjs/common");
const genai_1 = require("@google/genai");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
let GeminiService = GeminiService_1 = class GeminiService {
    ai;
    logger = new common_1.Logger(GeminiService_1.name);
    systemInstruction = `You are an elite corporate ERP AI Document Search Assistant.
CRITICAL RULES:
1. Base your answer STRICTLY and EXCLUSIVELY on the provided documents. Do NOT invent or guess information.
2. If the user asks for a document, a file, or a link, you MUST provide the exact Google Drive link from the Reference Directory.
3. Format links cleanly in Markdown: [Document Name](URL).
4. Always cite your source document at the end of your answer.`;
    constructor() {
        this.ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    async uploadFileToGemini(filePath, mimeType, displayName) {
        try {
            const uploadResult = await this.ai.files.upload({
                file: filePath,
                config: { mimeType, displayName },
            });
            return { fileUri: uploadResult.uri, fileId: uploadResult.name };
        }
        catch (error) {
            this.logger.error(`Gemini Upload Failed: ${error.message}`);
            throw error;
        }
    }
    async checkFileStatus(fileId) {
        const file = await this.ai.files.get({ name: fileId });
        return file.state;
    }
    async deleteGeminiFile(fileId) {
        await this.ai.files.delete({ name: fileId });
    }
    async createDocumentCache(filesData, modelName = 'gemini-3.6-flash') {
        try {
            const directoryText = "Reference Directory:\n" + filesData.map(f => `- ${f.name}: ${f.driveLink}`).join('\n');
            const cache = await this.ai.caches.create({
                model: modelName,
                config: {
                    systemInstruction: this.systemInstruction,
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: directoryText },
                                ...filesData.map(file => ({
                                    fileData: { fileUri: file.uri, mimeType: file.mimeType }
                                }))
                            ]
                        }
                    ],
                    ttl: '3600s',
                }
            });
            return cache.name || null;
        }
        catch (error) {
            this.logger.warn(`Context Cache skipped: ${error.message}`);
            return null;
        }
    }
    async askQuestion(query, filesData, cacheName, modelName = 'gemini-3.6-flash') {
        let config = { temperature: 0.0 };
        let parts = [];
        if (cacheName) {
            config.cachedContent = cacheName;
            parts = [{ text: query }];
        }
        else {
            config.systemInstruction = this.systemInstruction;
            const directoryText = "Reference Directory:\n" + filesData.map(f => `- ${f.name}: ${f.driveLink}`).join('\n');
            parts = [
                { text: directoryText },
                ...filesData.map(file => ({
                    fileData: { fileUri: file.uri, mimeType: file.mimeType }
                })),
                { text: query }
            ];
        }
        const response = await this.ai.models.generateContent({
            model: modelName,
            contents: [{ role: 'user', parts: parts }],
            config: config
        });
        return { text: response.text, usage: response.usageMetadata };
    }
};
exports.GeminiService = GeminiService;
exports.GeminiService = GeminiService = GeminiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GeminiService);
//# sourceMappingURL=gemini.service.js.map