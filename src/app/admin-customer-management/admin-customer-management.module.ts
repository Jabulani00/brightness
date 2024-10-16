import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminCustomerManagementPageRoutingModule } from './admin-customer-management-routing.module';

import { AdminCustomerManagementPage } from './admin-customer-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminCustomerManagementPageRoutingModule
  ],
  declarations: [AdminCustomerManagementPage]
})
export class AdminCustomerManagementPageModule {}
