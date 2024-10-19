import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// Import Swiper core and required modules
import Swiper from 'swiper';

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
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {
  @ViewChild('swiperContainer') swiperContainer!: ElementRef;

  isScrolled = false;
  promotions: Promotion[] = [];
  swiper!: Swiper;

  constructor(
    private menu: MenuController,
    private router: Router,
    private http: HttpClient
  ) {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.pageYOffset > 20;
  }

  openMenu() {
    this.menu.open();
  }

  Signup() {
    this.router.navigate(['/signup']);
  }

  browseProducts() {
    this.router.navigate(['/products']);
  }

  viewPromotions() {
    this.router.navigate(['/promotions']);
  }

  viewAccount() {
    this.router.navigate(['/account']);
  }

  ngOnInit() {
    this.onWindowScroll();
    this.fetchPromotions();
  }

  ngAfterViewInit() {
    this.initSwiper();
  }

  initSwiper() {
    this.swiper = new Swiper(this.swiperContainer.nativeElement, {
      slidesPerView: 1,
      spaceBetween: 10,
      centeredSlides: true,
      loop: true,
      autoplay: {
        delay: 5000,
      },
      breakpoints: {
        640: {
          slidesPerView: 2,
        },
        1024: {
          slidesPerView: 3,
        },
      },
    });
  }

  fetchPromotions() {
    this.http.get<Promotion[]>('http://localhost/user_api/promotions.php')
      .subscribe(
        (response) => {
          this.promotions = response;
          setTimeout(() => {
            this.initSwiper();
          });
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

  ngOnDestroy() {
    if (this.swiper) {
      this.swiper.destroy();
    }
  }
}