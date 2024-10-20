import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Chart, ChartConfiguration } from 'chart.js/auto';

interface Product {
  product_id: number;
  name: string;
  category: string;
  stock_quantity: number;
  sales_count: number;
  last_sale_date: string;
  movement_rate: number;
  movement_category: 'fast' | 'medium' | 'slow';
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
})
export class AdminDashboardPage implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesChartCanvas!: ElementRef;

  totalUsers: number = 0;
  totalSalesAmount: number = 0;
  pendingOrders: number = 0;
  salesChart: Chart | null = null;
  currentFilter: string = 'week';

  products: Product[] = [];
  fastMoving: Product[] = [];
  slowMoving: Product[] = [];
  selectedMovementView: 'fast' | 'slow' = 'fast';

  fastMovingThreshold: number = 100; // Items sold per month threshold for fast-moving
  slowMovingThreshold: number = 20;  // Items sold per month threshold for slow-moving

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchUserCount();
    this.fetchTotalSalesAmount();
    this.fetchPendingOrdersCount();
    this.fetchSalesData(this.currentFilter);
    this.loadProducts();
  }

  ngAfterViewInit() {
    this.updateChart();
  }
  

  fetchUserCount() {
    this.http.get<{ user_count: number }>('http://localhost/user_api/register.php?count=true')
      .subscribe({
        next: (response) => {
          this.totalUsers = response.user_count;
        },
        error: (error) => {
          console.error('Error fetching user count:', error);
        }
      });
  }

  fetchTotalSalesAmount() {
    this.http.get<{ totalSalesAmount: number }>('http://localhost/user_api/sales.php?total_only=true')
      .subscribe({
        next: (response) => {
          this.totalSalesAmount = response.totalSalesAmount;
        },
        error: (error) => {
          console.error('Error fetching total sales amount:', error);
        }
      });
  }

  fetchPendingOrdersCount() {
    this.http.get<{ order_count: number }>('http://localhost/user_api/orders.php?count=true')
      .subscribe({
        next: (response) => {
          this.pendingOrders = response.order_count;
        },
        error: (error) => {
          console.error('Error fetching order count:', error);
        }
      });
  }

  fetchSalesData(filter: string) {
    this.http.get<any[]>(`http://localhost/user_api/sales.php?filter=${filter}`)
      .subscribe({
        next: (response) => {
          this.updateChart(response);
        },
        error: (error) => {
          console.error('Error fetching sales data:', error);
        }
      });
  }

  updateChart(salesData: any[] = []) {
    if (!this.salesChartCanvas) return;

    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');

    salesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const labels = salesData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const data = salesData.map(item => parseFloat(item.total_amount));

    const chartConfig: ChartConfiguration = {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sales',
          data: data,
          fill: true,
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgb(75, 192, 192)',
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            },
            pointLabels: {
              display: true,
              font: {
                size: 12
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        }
      }
    };

    if (this.salesChart) {
      this.salesChart.destroy();
    }

    this.salesChart = new Chart(ctx, chartConfig);
  }

  changeFilter(event: CustomEvent) {
    const filter = event.detail.value;
    if (filter) {
      this.currentFilter = filter;
      this.fetchSalesData(filter);
    }
  }

  loadProducts() {
    this.http.get<Product[]>('http://localhost/user_api/products.php')
      .subscribe(
        products => {
          this.products = products;
          this.calculateMovementRates();
        },
        error => {
          console.error('Error fetching products:', error);
        }
      );
  }

  calculateMovementRates() {
    const currentDate = new Date();
    const thirtyDaysAgo = new Date(currentDate.getTime() - (30 * 24 * 60 * 60 * 1000));
  
    this.http.get<any>('http://localhost/user_api/orders.php?get_order_items=true&start_date=' + thirtyDaysAgo.toISOString())
      .subscribe(
        response => {
          let orderItems: any[] = [];
          
          // Check the structure of the response and extract orderItems
          if (Array.isArray(response)) {
            orderItems = response;
          } else if (response && Array.isArray(response.order_items)) {
            orderItems = response.order_items;
          } else if (response && typeof response === 'object') {
            orderItems = Object.values(response);
          } else {
            console.error('Unexpected response structure:', response);
            return;
          }
  
          const salesCountMap = new Map<number, number>();
          const lastSaleDateMap = new Map<number, string>();
  
          orderItems.forEach(item => {
            const productId = item.product_id;
            const quantity = item.quantity;
            const orderDate = new Date(item.created_at);
  
            salesCountMap.set(productId, (salesCountMap.get(productId) || 0) + quantity);
  
            if (!lastSaleDateMap.has(productId) || new Date(lastSaleDateMap.get(productId)!) < orderDate) {
              lastSaleDateMap.set(productId, item.created_at);
            }
          });
  
          this.products.forEach(product => {
            product.sales_count = salesCountMap.get(product.product_id) || 0;
            product.last_sale_date = lastSaleDateMap.get(product.product_id) || '';
  
            if (product.sales_count && product.last_sale_date) {
              const lastSaleDate = new Date(product.last_sale_date);
              const daysSinceLastSale = Math.max(1, Math.floor((currentDate.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24)));
              product.movement_rate = (product.sales_count / daysSinceLastSale) * 30;
  
              if (product.movement_rate >= this.fastMovingThreshold) {
                product.movement_category = 'fast';
              } else if (product.movement_rate <= this.slowMovingThreshold) {
                product.movement_category = 'slow';
              } else {
                product.movement_category = 'medium';
              }
            } else {
              product.movement_rate = 0;
              product.movement_category = 'slow';
            }
          });
  
          this.updateMovementLists();
        },
        error => {
          console.error('Error fetching order items:', error);
        }
      );
  }

  updateMovementLists() {
    this.fastMoving = this.products
      .filter(p => p.movement_category === 'fast')
      .sort((a, b) => b.movement_rate - a.movement_rate)
      .slice(0, 10);

    this.slowMoving = this.products
      .filter(p => p.movement_category === 'slow')
      .sort((a, b) => a.movement_rate - b.movement_rate)
      .slice(0, 10);
  }

  toggleMovementView(event: CustomEvent) {
    const selectedValue = event.detail.value;
    if (selectedValue === 'fast' || selectedValue === 'slow') {
      this.selectedMovementView = selectedValue;
    }
  }

  getMovementStatusClass(rate: number): string {
    if (rate >= this.fastMovingThreshold) return 'movement-fast';
    if (rate <= this.slowMovingThreshold) return 'movement-slow';
    return 'movement-medium';
  }

  formatMovementRate(rate: number): string {
    return rate.toFixed(1) + ' units/month';
  }

  formatSalesCount(count: number | undefined): string {
    return count !== undefined ? count.toString() : 'N/A';
  }
}