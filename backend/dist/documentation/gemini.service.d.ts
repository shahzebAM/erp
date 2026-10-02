export declare class GeminiService {
    private ai;
    private readonly logger;
    private readonly systemInstruction;
    constructor();
    uploadFileToGemini(filePath: string, mimeType: string, displayName: string): Promise<{
        fileUri: string | undefined;
        fileId: string | undefined;
    }>;
    checkFileStatus(fileId: string): Promise<string>;
    deleteGeminiFile(fileId: string): Promise<void>;
    createDocumentCache(filesData: {
        uri: string;
        mimeType: string;
        name: string;
        driveLink: string;
    }[], modelName?: string): Promise<string | null>;
    askQuestion(query: string, filesData: {
        uri: string;
        mimeType: string;
        name: string;
        driveLink: string;
    }[], cacheName?: string | null, modelName?: string): Promise<{
        text: string | undefined;
        usage: import("@google/genai", { with: { "resolution-mode": "import" } }).GenerateContentResponseUsageMetadata | undefined;
    }>;
}
