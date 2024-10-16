import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  showNavbar = false;
  isAdminPage = false;

  regularPages = [
    { title: 'Home', url: '/home', icon: 'home' },
    { title: 'Contact', url: '/contact', icon: 'mail' },
    { title: 'About', url: '/about', icon: 'information-circle' },
    { title: 'View', url: '/view', icon: 'eye' }
  ];

  adminPages = [
    { title: 'Dashboard', url: '/admin-dashboard', icon: 'speedometer' },
    { title: 'Inventory', url: '/admin-inventory-management', icon: 'cube' },
    { title: 'Customers', url: '/admin-customer-management', icon: 'people' },
    { title: 'Sales Report', url: '/admin-sales-report', icon: 'bar-chart' },
    { title: 'Orders', url: '/admin-order-management', icon: 'cart' },
    { title: 'Users', url: '/admin-user-management', icon: 'person' }
  ];

  constructor(
    private router: Router,
    private menuController: MenuController
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkCurrentPage(event.url);
      }
    });
  }

  ngOnInit() {
    this.checkCurrentPage(this.router.url);
  }

  checkCurrentPage(url: string) {
    const allPages = [...this.regularPages, ...this.adminPages];
    this.showNavbar = allPages.some(page => url.includes(page.url));
    this.isAdminPage = this.adminPages.some(page => url.includes(page.url));
  }

  toggleMenu() {
    this.menuController.toggle('main-menu');
  }
}