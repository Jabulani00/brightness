import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-order-history',
  templateUrl: './order-history.page.html',
  styleUrls: ['./order-history.page.scss'],
})
export class OrderHistoryPage implements OnInit {
  orders: any[] = []; // Fetch from a service or API

  constructor(private router: Router) { }

  ngOnInit() {
    this.fetchOrders();
  }
  fetchOrders() {
    // Implement logic to fetch orders from the backend
  }

  viewOrderDetails(orderId: string) {
    this.router.navigate(['/orders/details', orderId]);
  }
}


