"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentationModule = void 0;
const common_1 = require("@nestjs/common");
const document_controller_1 = require("./document.controller");
const document_service_1 = require("./document.service");
const gemini_service_1 = require("./gemini.service");
const drive_service_1 = require("./drive.service");
let DocumentationModule = class DocumentationModule {
};
exports.DocumentationModule = DocumentationModule;
exports.DocumentationModule = DocumentationModule = __decorate([
    (0, common_1.Module)({
        controllers: [document_controller_1.DocumentController],
        providers: [document_service_1.DocumentService, gemini_service_1.GeminiService, drive_service_1.DriveService],
    })
], DocumentationModule);
//# sourceMappingURL=documentation.module.js.map