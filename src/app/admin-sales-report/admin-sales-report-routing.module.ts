import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdminSalesReportPage } from './admin-sales-report.page';

const routes: Routes = [
  {
    path: '',
    component: AdminSalesReportPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminSalesReportPageRoutingModule {}
