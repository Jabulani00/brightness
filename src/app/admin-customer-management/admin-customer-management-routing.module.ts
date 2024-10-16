import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminCustomerManagementPage } from './admin-customer-management.page';

const routes: Routes = [
  {
    path: '',
    component: AdminCustomerManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminCustomerManagementPageRoutingModule {}
