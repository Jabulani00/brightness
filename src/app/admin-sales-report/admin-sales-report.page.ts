import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-sales-report',
  templateUrl: './admin-sales-report.page.html',
  styleUrls: ['./admin-sales-report.page.scss'],
})
export class AdminSalesReportPage implements OnInit {
  salesData: any[] = [];
  totalSalesAmount: number = 0;
  totalOrders: number = 0;
  averageOrderValue: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchSalesData();
  }

  fetchSalesData() {
    this.http.get<{ salesData: any[], totalSalesAmount: number }>('http://localhost/user_api/sales.php')
      .subscribe(response => {
        this.salesData = response.salesData;
        this.totalSalesAmount = response.totalSalesAmount;
        this.totalOrders = this.salesData.length;
        this.calculateAverageOrderValue();
      });
  }

  calculateAverageOrderValue() {
    if (this.totalOrders > 0) {
      this.averageOrderValue = this.totalSalesAmount / this.totalOrders;
    } else {
      this.averageOrderValue = 0;
    }
  }
}