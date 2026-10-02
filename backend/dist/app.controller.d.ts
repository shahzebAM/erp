import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHello(): string;
    setupAdmin(body: any): Promise<{
        message: string;
    }>;
    login(body: any): Promise<{
        message: string;
    }>;
    getAdmins(): Promise<{
        id: number;
        username: string;
        role: string;
        modules: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
        moduleOrder: string[];
        status: string;
        isOnline: boolean;
    }[]>;
    createAdmin(body: any): Promise<{
        message: string;
    }>;
    resetAdminPassword(id: number, body: any): Promise<{
        message: string;
    }>;
    updateAdminRole(id: number, body: any): Promise<{
        message: string;
    }>;
    updateAdminModules(id: number, body: any): Promise<{
        message: string;
    }>;
    deleteAdmin(id: number): Promise<{
        message: string;
    }>;
    updateAdminPreferences(id: string, body: any): Promise<{
        message: string;
    }>;
    updateAdminStatus(id: number, body: {
        isOnline: boolean;
    }): Promise<{
        message: string;
    }>;
}
