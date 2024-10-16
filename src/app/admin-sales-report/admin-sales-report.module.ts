import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminSalesReportPageRoutingModule } from './admin-sales-report-routing.module';

import { AdminSalesReportPage } from './admin-sales-report.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminSalesReportPageRoutingModule
  ],
  declarations: [AdminSalesReportPage]
})
export class AdminSalesReportPageModule {}
