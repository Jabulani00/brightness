import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CashierPage } from './cashier.page';

const routes: Routes = [
  {
    path: '',
    component: CashierPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CashierPageRoutingModule {}
