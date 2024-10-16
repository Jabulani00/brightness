import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { AnimationController } from '@ionic/angular';
import { forkJoin, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
interface Order {
  order_id: number;
  user_id: number;
  total_amount: string; // Change this to string
  order_type: string;
  status: string;
  
}

interface Sale {
  sale_id: number;
  order_id: number;
  cashier_id: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
}

interface RecentActivity {
  id: number;
  type: 'order' | 'sale';
  message: string;
  amount: number;
  status?: string;
  payment_method?: string;
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
  salesData: any[] = [];
  currentFilter: string = 'week';
  recentActivities: RecentActivity[] = [];
  isLoadingActivities = false;
  activitiesError: string | null = null;

  constructor(private http: HttpClient, private router: Router,  private animationCtrl: AnimationController) { }

  ngOnInit() {
    this.fetchUserCount();
    this.fetchTotalSalesAmount();
    this.fetchPendingOrdersCount();
    this.fetchSalesData(this.currentFilter);
  }
  

  ngAfterViewInit() {
    this.updateChart();
    this.fetchRecentActivities();
  }
  fetchRecentActivities() {
    this.isLoadingActivities = true;
    this.activitiesError = null;
  
    const orders$ = this.http.get<{orderData: Order[]}>('http://localhost/user_api/orders.php').pipe(
      map(response => response.orderData),
      catchError(error => {
        console.error('Error fetching orders:', error);
        return of([]);
      })
    );
  
    const sales$ = this.http.get<{salesData: Sale[]}>('http://localhost/user_api/sales.php').pipe(
      map(response => response.salesData),
      catchError(error => {
        console.error('Error fetching sales:', error);
        return of([]);
      })
    );
  
    forkJoin([orders$, sales$]).pipe(
      map(([orders, sales]) => {
        console.log('Fetched orders:', orders);
        console.log('Fetched sales:', sales);
  
        const orderActivities: RecentActivity[] = orders.map(order => ({
          id: order.order_id,
          type: 'order',
          message: `Order #${order.order_id} ${order.status}`,
          amount: parseFloat(order.total_amount), // This should now work correctly
          status: order.status
        }));
  
        const saleActivities: RecentActivity[] = sales.map(sale => ({
          id: sale.sale_id,
          type: 'sale',
          message: `Sale #${sale.sale_id} completed`,
          amount: sale.total_amount,
          payment_method: sale.payment_method
        }));
  
        return [...orderActivities, ...saleActivities]
          .sort((a, b) => b.id - a.id)
          .slice(0, 5);
      })
    ).subscribe({
      next: (activities) => {
        console.log('Processed activities:', activities);
        this.recentActivities = activities;
        this.isLoadingActivities = false;
        setTimeout(() => this.animateActivities(), 100);
      },
      error: (error) => {
        console.error('Error processing activities:', error);
        this.activitiesError = 'Failed to load recent activities';
        this.isLoadingActivities = false;
      }
    });
  }
  async animateActivities() {
    const activityItems = document.querySelectorAll('.activity-item');
    for (let i = 0; i < activityItems.length; i++) {
      const element = activityItems[i] as HTMLElement;
      const animation = this.animationCtrl.create()
        .addElement(element)
        .duration(300)
        .delay(i * 100)
        .fromTo('opacity', '0', '1')
        .fromTo('transform', 'translateX(-20px)', 'translateX(0)')
        .easing('ease-out');

      await animation.play();
    }
  }


  getStatusColor(status: string | undefined): string {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'canceled': return 'danger';
      default: return 'medium';
    }
  }

  refreshActivities(event: any) {
    this.fetchRecentActivities();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
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
          this.salesData = response;
          console.log('Fetched sales data:', this.salesData);
          this.updateChart();
        },
        error: (error) => {
          console.error('Error fetching sales data:', error);
        }
      });
  }

  updateChart() {
    if (!this.salesChartCanvas) return;
  
    const ctx = this.salesChartCanvas.nativeElement.getContext('2d');
  
    // Sort the data by date
    this.salesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
    const labels = this.salesData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const data = this.salesData.map(item => parseFloat(item.total_amount));
  
    const chartConfig: ChartConfiguration = {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sales',
          data: data,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1,
          pointRadius: 5,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Total Amount (R)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
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

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}