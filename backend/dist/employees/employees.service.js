"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
let EmployeesService = class EmployeesService {
    async getEmployees() {
        return await prisma.employee.findMany();
    }
    async createEmployee(data) {
        const sanitize = (val) => (val && val.toString().trim() !== '') ? val.toString().trim() : null;
        return await prisma.employee.create({
            data: {
                employeeId: data.employeeId,
                firstName: data.firstName,
                middleName: sanitize(data.middleName),
                lastName: data.lastName,
                company: data.company,
                dateOfBirth: data.dateOfBirth,
                address: data.address,
                civilStatus: data.civilStatus,
                baseRate: data.baseRate,
                employmentStatus: data.employmentStatus,
                tin: sanitize(data.tin),
                sssNumber: sanitize(data.sssNumber),
                philhealth: sanitize(data.philhealth),
                pagIbig: sanitize(data.pagIbig),
                bankAccount: sanitize(data.bankAccount),
                cashAdvanceBalance: data.cashAdvanceBalance || 0,
                cashAdvanceInstallment: data.cashAdvanceInstallment || 0,
                loanBalance: data.loanBalance || 0,
                loanInstallment: data.loanInstallment || 0,
            }
        });
    }
    async updateEmployee(id, data) {
        const { id: _id, ...cleanData } = data;
        const sanitize = (val) => (val && val.toString().trim() !== '') ? val.toString().trim() : null;
        if (cleanData.tin !== undefined)
            cleanData.tin = sanitize(cleanData.tin);
        if (cleanData.sssNumber !== undefined)
            cleanData.sssNumber = sanitize(cleanData.sssNumber);
        if (cleanData.philhealth !== undefined)
            cleanData.philhealth = sanitize(cleanData.philhealth);
        if (cleanData.pagIbig !== undefined)
            cleanData.pagIbig = sanitize(cleanData.pagIbig);
        if (cleanData.bankAccount !== undefined)
            cleanData.bankAccount = sanitize(cleanData.bankAccount);
        if (cleanData.middleName !== undefined)
            cleanData.middleName = sanitize(cleanData.middleName);
        return await prisma.employee.update({
            where: { id },
            data: cleanData,
        });
    }
    async deleteEmployee(id) {
        return await prisma.employee.delete({
            where: { id },
        });
    }
    async getAttendances() {
        return await prisma.attendance.findMany();
    }
    async createAttendance(data) {
        return await prisma.attendance.create({ data });
    }
    async updateAttendance(id, data) {
        const { id: _id, ...cleanData } = data;
        return await prisma.attendance.update({
            where: { id },
            data: cleanData,
        });
    }
    async deleteAttendance(id) {
        return await prisma.attendance.delete({
            where: { id },
        });
    }
    async getPayrolls() {
        return await prisma.payroll.findMany();
    }
    async createPayroll(data) {
        return await prisma.payroll.create({
            data: {
                employeeId: data.employeeId,
                daysWorked: data.daysWorked,
                totalHours: data.totalHours,
                cashAdvance: data.cashAdvance || 0,
                companyLoan: data.companyLoan || 0,
                sssDeduction: data.sssDeduction || 0,
                pagIbigDeduct: data.pagIbigDeduct || 0,
                philhealthDeduct: data.philhealthDeduct || 0,
                tax: data.tax || 0,
                grossPay: data.grossPay,
                netPay: data.netPay,
                pagIbigLoan: data.pagIbigLoan || 0,
                pagIbigHousingLoan: data.pagIbigHousingLoan || 0,
                sssProvident: data.sssProvident || 0,
                sssSalaryLoan: data.sssSalaryLoan || 0,
                sssCalamityLoan: data.sssCalamityLoan || 0,
                pagIbigCalamity: data.pagIbigCalamity || 0,
                pagIbigSalaryLoan: data.pagIbigSalaryLoan || 0,
            }
        });
    }
    async deletePayroll(id) {
        return await prisma.payroll.delete({
            where: { id },
        });
    }
    async getSettings() {
        let settings = await prisma.settings.findFirst();
        if (!settings) {
            settings = await prisma.settings.create({
                data: { shiftStart: "08:00", shiftEnd: "17:00" }
            });
        }
        return settings;
    }
    async updateSettings(data) {
        const existing = await prisma.settings.findFirst();
        if (existing) {
            return await prisma.settings.update({
                where: { id: existing.id },
                data: { shiftStart: data.shiftStart, shiftEnd: data.shiftEnd }
            });
        }
        else {
            return await prisma.settings.create({
                data: { shiftStart: data.shiftStart, shiftEnd: data.shiftEnd }
            });
        }
    }
};
exports.EmployeesService = EmployeesService;
exports.EmployeesService = EmployeesService = __decorate([
    (0, common_1.Injectable)()
], EmployeesService);
//# sourceMappingURL=employees.service.js.map