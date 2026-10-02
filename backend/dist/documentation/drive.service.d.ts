export declare class DriveService {
    private readonly logger;
    private drive;
    constructor();
    getOrCreateCompanyFolder(companyName: string): Promise<string>;
    getCompanyDirectory(companyName: string): Promise<{
        companyFolderId: string;
        folders: any[];
        files: any[];
    }>;
    createSubFolder(companyName: string, folderName: string, parentFolderId?: string): Promise<any>;
    uploadFileToDrive(fileBuffer: Buffer, mimeType: string, originalName: string, company: string, targetFolderId?: string): Promise<any>;
    deleteFile(fileId: string): Promise<void>;
    renameFolder(folderId: string, newName: string): Promise<any>;
    getStorageQuota(): Promise<{
        usage: any;
        limit: any;
    } | null>;
}
