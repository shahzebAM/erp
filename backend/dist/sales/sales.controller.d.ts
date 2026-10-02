export declare class SalesController {
    getCustomers(company: string, search?: string, page?: string, limit?: string): Promise<{
        data: {
            id: string;
            name: string;
            address: string | null;
            createdAt: Date;
            company: string;
            contact: string | null;
            phone: string | null;
            email: string | null;
            creditLimit: number;
            balance: number;
        }[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    createCustomer(data: any): Promise<{
        id: string;
        name: string;
        address: string | null;
        createdAt: Date;
        company: string;
        contact: string | null;
        phone: string | null;
        email: string | null;
        creditLimit: number;
        balance: number;
    }>;
    updateCustomer(id: string, data: any): Promise<{
        id: string;
        name: string;
        address: string | null;
        createdAt: Date;
        company: string;
        contact: string | null;
        phone: string | null;
        email: string | null;
        creditLimit: number;
        balance: number;
    }>;
    updateCustomerBalance(id: string, amount: number): Promise<{
        id: string;
        name: string;
        address: string | null;
        createdAt: Date;
        company: string;
        contact: string | null;
        phone: string | null;
        email: string | null;
        creditLimit: number;
        balance: number;
    }>;
}
