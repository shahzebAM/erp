import { DocumentService } from './document.service';
import { DriveService } from './drive.service';
export declare class DocumentController {
    private readonly documentService;
    private readonly driveService;
    constructor(documentService: DocumentService, driveService: DriveService);
    getDirectory(company: string): Promise<{
        storageQuota: {
            usage: any;
            limit: any;
        } | null;
        companyFolderId: string;
        folders: any[];
        files: any[];
    }>;
    createFolder(company: string, body: {
        folderName: string;
        parentFolderId?: string;
        targetFolderId?: string;
    }): Promise<any>;
    renameFolder(id: string, body: {
        newName: string;
    }): Promise<any>;
    uploadFile(file: any, company: string, username: string, targetFolderId?: string): Promise<{
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
    search(query: string, targetModel: string, company: string, username: string): Promise<{
        answer: string;
        model: string;
        sourcesSearched: number;
        cached: boolean;
    }>;
    deleteDocument(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
