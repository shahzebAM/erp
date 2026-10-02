export declare class SettingsController {
    getSettings(company: string): Promise<{
        id: number;
        company: string;
        shiftStart: string;
        shiftEnd: string;
    }[]>;
    updateSettings(data: {
        company: string;
        shiftStart: string;
        shiftEnd: string;
    }): Promise<{
        id: number;
        company: string;
        shiftStart: string;
        shiftEnd: string;
    }>;
    getWarehouses(company: string): Promise<{
        id: number;
        status: string;
        name: string;
        address: string;
        createdAt: Date;
        company: string;
    }[]>;
    createWarehouse(data: {
        company: string;
        name: string;
        address: string;
        status: string;
    }): Promise<{
        id: number;
        status: string;
        name: string;
        address: string;
        createdAt: Date;
        company: string;
    }>;
    updateWarehouseStatus(id: string, data: {
        status: string;
    }): Promise<{
        id: number;
        status: string;
        name: string;
        address: string;
        createdAt: Date;
        company: string;
    }>;
}
