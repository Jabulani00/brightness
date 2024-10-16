import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminOrderManagementPage } from './admin-order-management.page';

const routes: Routes = [
  {
    path: '',
    component: AdminOrderManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminOrderManagementPageRoutingModule {}
