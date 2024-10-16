import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminUserManagementPage } from './admin-user-management.page';

const routes: Routes = [
  {
    path: '',
    component: AdminUserManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminUserManagementPageRoutingModule {}
