import { GeminiService } from './gemini.service';
import { DriveService } from './drive.service';
export declare class DocumentService {
    private geminiService;
    private driveService;
    private readonly logger;
    private companyCache;
    constructor(geminiService: GeminiService, driveService: DriveService);
    getCompanyDirectory(company: string): Promise<{
        companyFolderId: string;
        folders: any[];
        files: any[];
    }>;
    createFolder(company: string, folderName: string): Promise<any>;
    processNewDocument(file: any, company: string, username: string, targetFolderId?: string): Promise<{
        id: number;
        status: string;
        createdAt: Date;
        company: string;
        mimeType: string;
        filename: string;
        originalName: string;
        sizeBytes: number;
        geminiFileUri: string | null;
        geminiFileId: string | null;
        uploadedBy: string;
        googleDriveLink: string | null;
    }>;
    searchDocuments(query: string, company: string, username: string, requestedModel?: string): Promise<{
        answer: string;
        model: string;
        sourcesSearched: number;
        cached: boolean;
    }>;
    deleteDocument(driveId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
