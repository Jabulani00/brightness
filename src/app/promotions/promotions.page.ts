import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Promotion {
  promotion_id: number;
  product_id: number;
  product_name: string;
  name: string;
  description: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
}

@Component({
  selector: 'app-promotions',
  templateUrl: './promotions.page.html',
  styleUrls: ['./promotions.page.scss'],
})
export class PromotionsPage implements OnInit {

  promotions: Promotion[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.fetchPromotions();
  }

  fetchPromotions() {
    this.http.get<Promotion[]>('http://localhost/user_api/promotions.php')
      .subscribe(
        (response) => {
          this.promotions = response;
        },
        (error) => {
          console.error('Error fetching promotions:', error);
        }
      );
  }

  isPromotionValid(endDate: string): boolean {
    const now = new Date();
    const promotionEndDate = new Date(endDate);
    return now <= promotionEndDate;
  }

  getDaysRemaining(endDate: string): number {
    const now = new Date();
    const promotionEndDate = new Date(endDate);
    const diffTime = promotionEndDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 3600 * 24));
  }
}