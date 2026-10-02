export declare class CompaniesController {
    findAll(): Promise<{
        id: string;
        name: string;
        createdAt: Date;
    }[]>;
    create(data: {
        name: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
    }>;
    remove(name: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
    }>;
}
