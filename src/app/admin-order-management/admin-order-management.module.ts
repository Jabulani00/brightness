import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminOrderManagementPageRoutingModule } from './admin-order-management-routing.module';

import { AdminOrderManagementPage } from './admin-order-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminOrderManagementPageRoutingModule
  ],
  declarations: [AdminOrderManagementPage]
})
export class AdminOrderManagementPageModule {}
