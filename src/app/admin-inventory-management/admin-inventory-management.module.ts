import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminInventoryManagementPageRoutingModule } from './admin-inventory-management-routing.module';

import { AdminInventoryManagementPage } from './admin-inventory-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminInventoryManagementPageRoutingModule
  ],
  declarations: [AdminInventoryManagementPage]
})
export class AdminInventoryManagementPageModule {}
