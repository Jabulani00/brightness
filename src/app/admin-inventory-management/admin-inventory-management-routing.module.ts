import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminInventoryManagementPage } from './admin-inventory-management.page';

const routes: Routes = [
  {
    path: '',
    component: AdminInventoryManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminInventoryManagementPageRoutingModule {}
