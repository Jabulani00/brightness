import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { POSPage } from './pos.page';

const routes: Routes = [
  {
    path: '',
    component: POSPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class POSPageRoutingModule {}
