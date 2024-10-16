import { Component } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  public appPages = [
    { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Products', url: '/products', icon: 'grid' },
    { title: 'Promotions', url: '/promotions', icon: 'pricetag' },
    { title: 'Account', url: '/account', icon: 'person' },
  ];

  public adminPages = [
    { title: 'Admin Dashboard', url: '/admin-dashboard' },
    { title: 'Customer Management', url: '/admin-customer-management' },
    { title: 'Inventory Management', url: '/admin-inventory-management' },
    { title: 'Order Management', url: '/admin-order-management' },
    { title: 'Sales Report', url: '/admin-sales-report' },
    { title: 'User Management', url: '/admin-user-management' },
  ];

  public showAdminButtons = false;

  constructor(private menu: MenuController, private router: Router) {
    this.initializeApp();
  }

  navigateToAuth() {
    this.router.navigate(['/auth']);
  }

  initializeApp() {
    this.menu.enable(true, 'first');
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const adminUrls = this.adminPages.map(page => page.url);
      this.showAdminButtons = adminUrls.includes(event.urlAfterRedirects);
    });
  }
}