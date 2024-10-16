import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ShippingMethodPage } from './pages/checkout/shipping-method/shipping-method.page';
import { ShippingAddressPage } from './pages/checkout/shipping-address/shipping-address.page';
import { PaymentPage } from './pages/checkout/payment/payment.page';
import { OrderSummaryPage } from './pages/checkout/order-summary/order-summary.page';
import { ReactiveFormsModule } from '@angular/forms';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'admin-dashboard',
    loadChildren: () => import('./admin-dashboard/admin-dashboard.module').then( m => m.AdminDashboardPageModule)
  },
  {
    path: 'admin-inventory-management',
    loadChildren: () => import('./admin-inventory-management/admin-inventory-management.module').then( m => m.AdminInventoryManagementPageModule)
  },
  {
    path: 'admin-sales-report',
    loadChildren: () => import('./admin-sales-report/admin-sales-report.module').then( m => m.AdminSalesReportPageModule)
  },
  {
    path: 'admin-customer-management',
    loadChildren: () => import('./admin-customer-management/admin-customer-management.module').then( m => m.AdminCustomerManagementPageModule)
  },
  {
    path: 'admin-order-management',
    loadChildren: () => import('./admin-order-management/admin-order-management.module').then( m => m.AdminOrderManagementPageModule)
  },
  {
    path: 'admin-user-management',
    loadChildren: () => import('./admin-user-management/admin-user-management.module').then( m => m.AdminUserManagementPageModule)
  },
  {
    path: 'signup',
    loadChildren: () => import('./signup/signup.module').then( m => m.SignupPageModule)
  },
  {
    path: 'pos',
    loadChildren: () => import('./pos/pos.module').then( m => m.POSPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'products',
    loadChildren: () => import('./products/products.module').then(m => m.ProductsPageModule)
  },
  {
    path: 'promotions',
    loadChildren: () => import('./promotions/promotions.module').then(m => m.PromotionsPageModule)
  },
  {
    path: 'account',
    loadChildren: () => import('./account/account.module').then(m => m.AccountPageModule)
  },
  {
    path: 'products',
    loadChildren: () => import('./products/products.module').then( m => m.ProductsPageModule)
  },
  {
    path: 'promotions',
    loadChildren: () => import('./promotions/promotions.module').then( m => m.PromotionsPageModule)
  },
  {
    path: 'account',
    loadChildren: () => import('./account/account.module').then( m => m.AccountPageModule)
  },
  {
    path: 'cart',
    loadChildren: () => import('./cart/cart.module').then( m => m.CartPageModule)
  },
  {
    path: 'about-us',
    loadChildren: () => import('./about-us/about-us.module').then( m => m.AboutUsPageModule)
  },
  {
    path: 'shipping-method',
    loadChildren: () => import('./pages/checkout/shipping-method/shipping-method.module').then( m => m.ShippingMethodPageModule)
  },
  {
    path: 'shipping-address',
    loadChildren: () => import('./pages/checkout/shipping-address/shipping-address.module').then( m => m.ShippingAddressPageModule)
  },
  {
    path: 'payment',
    loadChildren: () => import('./pages/checkout/payment/payment.module').then( m => m.PaymentPageModule)
  },
  {
    path: 'order-summary',
    loadChildren: () => import('./pages/checkout/order-summary/order-summary.module').then( m => m.OrderSummaryPageModule)
  },
  {
    path: 'order-history',
    loadChildren: () => import('./pages/orders/order-history/order-history.module').then( m => m.OrderHistoryPageModule)
  },
  {
    path: 'order-details',
    loadChildren: () => import('./pages/orders/order-details/order-details.module').then( m => m.OrderDetailsPageModule)
  },

  { path: 'checkout/shipping-method', component: ShippingMethodPage },
  { path: 'checkout/shipping-address', component: ShippingAddressPage },
  { path: 'checkout/payment', component: PaymentPage },
  { path: 'checkout/order-summary', component: OrderSummaryPage },  {
    path: 'contact',
    loadChildren: () => import('./contact/contact.module').then( m => m.ContactPageModule)
  },
  {
    path: 'privacy-policy',
    loadChildren: () => import('./privacy-policy/privacy-policy.module').then( m => m.PrivacyPolicyPageModule)
  },
  {
    path: 'cashier',
    loadChildren: () => import('./cashier/cashier.module').then( m => m.CashierPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./forgot-password/forgot-password.module').then( m => m.ForgotPasswordPageModule)
  },

  

];

@NgModule({
  imports: [
    
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
    // HttpClientModule,
    ReactiveFormsModule
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
