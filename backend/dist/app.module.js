"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const employees_module_1 = require("./employees/employees.module");
const documentation_module_1 = require("./documentation/documentation.module");
const companies_controller_1 = require("./companies/companies.controller");
const settings_controller_1 = require("./settings/settings.controller");
const master_inventory_controller_1 = require("./master-inventory/master-inventory.controller");
const sales_controller_1 = require("./sales/sales.controller");
const order_slips_controller_1 = require("./sales/order-slips.controller");
const purchase_orders_controller_1 = require("./sales/purchase-orders.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            employees_module_1.EmployeesModule,
            documentation_module_1.DocumentationModule,
        ],
        controllers: [
            app_controller_1.AppController,
            master_inventory_controller_1.MasterInventoryController,
            companies_controller_1.CompaniesController,
            settings_controller_1.SettingsController,
            sales_controller_1.SalesController,
            order_slips_controller_1.OrderSlipsController,
            purchase_orders_controller_1.ProcurementController
        ],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map