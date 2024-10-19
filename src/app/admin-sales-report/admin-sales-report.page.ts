import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, ChartConfiguration } from 'chart.js/auto';

@Component({
  selector: 'app-admin-sales-report',
  templateUrl: './admin-sales-report.page.html',
  styleUrls: ['./admin-sales-report.page.scss'],
})
export class AdminSalesReportPage implements OnInit {
  @ViewChild('salesTrendChart') salesTrendChartCanvas!: ElementRef;
  @ViewChild('productSalesChart') productSalesChartCanvas!: ElementRef;
  @ViewChild('monthlySalesChart') monthlySalesChartCanvas!: ElementRef;
  @ViewChild('paymentMethodChart') paymentMethodChartCanvas!: ElementRef;
  @ViewChild('hourlyTrendsChart') hourlyTrendsChartCanvas!: ElementRef;
  @ViewChild('customerSegmentChart') customerSegmentChartCanvas!: ElementRef;

  salesData: any[] = [];
  totalSalesAmount: number = 0;
  totalOrders: number = 0;
  
  averageOrderValue: number = 0;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchSalesData();
  }

  

  fetchSalesData() {
    this.http.get<any>('http://localhost/user_api/sales.php')
      .subscribe(response => {
        this.salesData = response.salesData;
        this.totalSalesAmount = response.totalSalesAmount;
        this.totalOrders = this.salesData.length;
        this.calculateAverageOrderValue();

        this.createSalesTrendChart();
        this.createProductSalesChart();
        this.createMonthlySalesChart();
        this.createPaymentMethodChart();
        this.createHourlyTrendsChart();
        this.createCustomerSegmentChart();
      });
  }

  calculateAverageOrderValue() {
    this.averageOrderValue = this.totalOrders > 0 ? this.totalSalesAmount / this.totalOrders : 0;
  }

  createSalesTrendChart() {
    const ctx = this.salesTrendChartCanvas.nativeElement.getContext('2d');
    const dailySales = this.getDailySales();

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(dailySales),
        datasets: [{
          label: 'Daily Sales',
          data: Object.values(dailySales),
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Sales Amount (R)' }
          },
          x: {
            title: { display: true, text: 'Date' }
          }
        }
      }
    } as ChartConfiguration);
  }

  createProductSalesChart() {
    const ctx = this.productSalesChartCanvas.nativeElement.getContext('2d');
    const productSales = this.getProductSales();

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(productSales),
        datasets: [{
          label: 'Product Sales',
          data: Object.values(productSales),
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Sales Amount (R)' }
          },
          x: {
            title: { display: true, text: 'Product' }
          }
        }
      }
    } as ChartConfiguration);
  }

  createMonthlySalesChart() {
    const ctx = this.monthlySalesChartCanvas.nativeElement.getContext('2d');
    const monthlySales = this.getMonthlySales();

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(monthlySales),
        datasets: [{
          label: 'Monthly Sales',
          data: Object.values(monthlySales),
          backgroundColor: 'rgba(153, 102, 255, 0.6)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Sales Amount (R)' }
          },
          x: {
            title: { display: true, text: 'Month' }
          }
        }
      }
    } as ChartConfiguration);
  }

  createPaymentMethodChart() {
    const ctx = this.paymentMethodChartCanvas.nativeElement.getContext('2d');
    const paymentMethods = this.getPaymentMethods();

    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(paymentMethods),
        datasets: [{
          data: Object.values(paymentMethods),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Payment Methods' }
        }
      }
    } as ChartConfiguration);
  }

  createHourlyTrendsChart() {
    const ctx = this.hourlyTrendsChartCanvas.nativeElement.getContext('2d');
    const hourlyTrends = this.getHourlyTrends();

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: Object.keys(hourlyTrends),
        datasets: [{
          label: 'Hourly Sales',
          data: Object.values(hourlyTrends),
          borderColor: 'rgb(255, 159, 64)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Sales Amount (R)' }
          },
          x: {
            title: { display: true, text: 'Hour' }
          }
        }
      }
    } as ChartConfiguration);
  }

  createCustomerSegmentChart() {
    const ctx = this.customerSegmentChartCanvas.nativeElement.getContext('2d');
    const customerSegments = this.getCustomerSegments();

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(customerSegments),
        datasets: [{
          data: Object.values(customerSegments),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Customer Segments' }
        }
      }
    } as ChartConfiguration);
  }

  getDailySales(): { [key: string]: number } {
    const dailySales: { [key: string]: number } = {};
    this.salesData.forEach(sale => {
      const date = new Date(sale.sale_date).toISOString().split('T')[0];
      dailySales[date] = (dailySales[date] || 0) + sale.total_amount;
    });
    return dailySales;
  }

  getProductSales(): { [key: string]: number } {
    const productSales: { [key: string]: number } = {};
    this.salesData.forEach(sale => {
      productSales[sale.product_name] = (productSales[sale.product_name] || 0) + sale.total_amount;
    });
    return productSales;
  }

  getMonthlySales(): { [key: string]: number } {
    const monthlySales: { [key: string]: number } = {};
    this.salesData.forEach(sale => {
      const monthYear = new Date(sale.sale_date).toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlySales[monthYear] = (monthlySales[monthYear] || 0) + sale.total_amount;
    });
    return monthlySales;
  }

  getPaymentMethods(): { [key: string]: number } {
    const paymentMethods: { [key: string]: number } = {};
    this.salesData.forEach(sale => {
      paymentMethods[sale.payment_method] = (paymentMethods[sale.payment_method] || 0) + 1;
    });
    return paymentMethods;
  }

  getHourlyTrends(): { [key: string]: number } {
    const hourlyTrends: { [key: string]: number } = {};
    this.salesData.forEach(sale => {
      const hour = new Date(sale.sale_date).getHours();
      hourlyTrends[hour] = (hourlyTrends[hour] || 0) + sale.total_amount;
    });
    return hourlyTrends;
  }

  getCustomerSegments(): { [key: string]: number } {
    // This is a placeholder. In a real scenario, you'd need to define your customer segments
    // and have this data available in your salesData
    return {
      'New Customers': 30,
      'Returning Customers': 50,
      'VIP Customers': 20
    };
  }
}