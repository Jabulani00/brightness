import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminUserManagementPageRoutingModule } from './admin-user-management-routing.module';

import { AdminUserManagementPage } from './admin-user-management.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminUserManagementPageRoutingModule
  ],
  declarations: [AdminUserManagementPage]
})
export class AdminUserManagementPageModule {}
