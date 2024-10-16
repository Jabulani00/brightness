import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShippingMethodPage } from './shipping-method.page';

const routes: Routes = [
  {
    path: '',
    component: ShippingMethodPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShippingMethodPageRoutingModule {}
