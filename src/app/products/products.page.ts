import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ToastController, IonSearchbar } from '@ionic/angular';
import { CartService } from '../services/cart.service';
import { PromotionService } from '../services/promotion.service'; 
import { NavController } from '@ionic/angular';

interface Product {
  product_id: number;
  name: string;
  price: number;
  description: string;
  image: string;
  total_ratings: number; // Track total number of ratings
  average_rating: number; // Track average rating
  isSale?: boolean;
  category: string;
  image_url: string; // Allow image_url to be optional
  quantity: number;
  stock_quantity: number;
  hasPromotion?: boolean;
  promotionName?: string;
  discountedPrice?: number;
}

interface Promotion {
  promotion_id: number;
  product_id: number;
  name: string;
  discount_percentage: number;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
})
export class ProductsPage implements OnInit {
  @ViewChild(IonSearchbar) searchbar!: IonSearchbar;

  products: Product[] = [];
  filteredProducts: Product[] = [];
  categories: string[] = ['All'];
  selectedCategory: string = 'All';
  sortOption: string = 'name';
  userId: string | null = null;
  promotions: Promotion[] = [];

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private navCtrl: NavController,
    private toastController: ToastController,
    private promotionService: PromotionService,
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.getUserId();
    this.loadPromotions();
  }

  getUserId() {
    this.userId = sessionStorage.getItem('userId');
    if (!this.userId) {
      console.warn('User is not logged in');
      // You might want to redirect to login page or show a message
    }
  }


  // Fetch products from MySQL
  loadProducts() {
    this.http.get<Product[]>('http://localhost/user_api/products.php').subscribe({
      next: (data: Product[]) => {
        this.products = data.map(product => ({ ...product, quantity: 1 }));
        this.filteredProducts = this.products;
        this.applyFilters();
        this.loadPromotions();
        this.extractCategories();
        console.log('Products loaded:', this.products);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading products:', error);
      }
    });
  }

  loadPromotions() {
    this.promotionService.getPromotions().subscribe({
      next: (promotions: Promotion[]) => {
        this.promotions = promotions.map(promo => ({
          ...promo,
          discount_percentage: this.ensureValidNumber(promo.discount_percentage)
        }));
        this.applyPromotions();
      },
      error: (error) => {
        console.error('Error loading promotions:', error);
      }
    });
  }

  applyPromotions() {
    this.products.forEach(product => {
      const promotion = this.promotions.find(p => p.product_id === product.product_id);
      if (promotion) {
        const discountAmount = product.price * (promotion.discount_percentage / 100);
        product.discountedPrice = this.roundToTwo(product.price - discountAmount);
        product.hasPromotion = true;
        product.promotionName = promotion.name;
      } else {
        product.discountedPrice = product.price;
        product.hasPromotion = false;
        product.promotionName = undefined;
      }
    });
    this.applyFilters(); // Re-apply filters to update displayed data
  }

  ensureValidNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }


  // Extract categories from products for the category filter
  extractCategories() {
    this.categories = ['All', ...new Set(this.products.map(product => product.category))];
  }

  // Method to handle product rating and update total_ratings and average_rating
  rateProduct(product: Product, rating: number) {
    const updatedProduct = { ...product };
    const newTotalRatings = updatedProduct.total_ratings + 1;
    const newAverage_rating = ((updatedProduct.average_rating * updatedProduct.total_ratings) + rating) / newTotalRatings;

    // Send the rating to the back-end
    this.http.post(`http://localhost/user_api/rate_product.php`, {
      product_id: product.product_id,
      rating: rating
    }).subscribe({
      next: (response) => {
        // Update product total_ratings and average locally
        updatedProduct.total_ratings = newTotalRatings;
        updatedProduct.average_rating = newAverage_rating;

        // Update locally without refreshing the entire page
        this.products = this.products.map(p => p.product_id === updatedProduct.product_id ? updatedProduct : p);
        this.applyFilters(); // Re-apply filters to update displayed data
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error rating product:', error);
      }
    });
  }

  // Search for products based on search term
  searchProducts() {
    this.applyFilters();
  }

  // Filter products by category
  filterByCategory(category: string) {
    this.selectedCategory = category;
    this.applyFilters();
  }

  // Sort products by the selected option
  sortProducts(option: string) {
    this.sortOption = option;
    this.applyFilters();
  }

  // Apply search, category filter, and sorting to the product list
  applyFilters() {
    const searchTerm = this.searchbar?.value?.toLowerCase() || '';

    // Filter products by search term, category, and stock
    this.filteredProducts = this.products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm);
      const matchesCategory = this.selectedCategory === 'All' || product.category === this.selectedCategory;
      const hasStock = product.stock_quantity > 0;

      // Show product if it matches the search term (regardless of stock) or if it has stock and matches the category
      return matchesSearch || (hasStock && matchesCategory);
    });
    // Sort products
    switch (this.sortOption) {
      case 'name':
        this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price_low_high':
        this.filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price_high_low':
        this.filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        this.filteredProducts.sort((a, b) => b.average_rating - a.average_rating);
        break;
    }
  }

  // Add product to cart and show a toast notification
  increaseQuantity(product: Product) {
    if (product.quantity) {
      product.quantity++;
    } else {
      product.quantity = 1;
    }
  }

  decreaseQuantity(product: Product) {
    if (product.quantity && product.quantity > 1) {
      product.quantity--;
    } else {
      product.quantity = 1;
    }
  }

  async addToCart(product: Product) {
    if (!this.userId) {
      const toast = await this.toastController.create({
        message: 'Please log in to add items to your cart',
        duration: 2000,
        position: 'bottom',
        color: 'warning'
      });
      toast.present();
      return;
    }

    if (!product.quantity || product.quantity < 1) {
      product.quantity = 1;
    }
  
    this.cartService.addToCart(product);
    
    const payload = {
      user_id: this.userId,
      product_id: product.product_id,
      quantity: product.quantity
    };
  
    console.log('Sending request to add to cart:', payload);
  
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
  
    try {
      const response: any = await this.http.post('http://localhost/user_api/cart.php', payload, { headers, observe: 'response' }).toPromise();
      
      console.log('Full response:', response);
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
      console.log('Product added to cart successfully');
  
      const toast = await this.toastController.create({
        message: `${product.quantity} ${product.name}(s) added to cart`,
        duration: 2000,
        position: 'bottom',
      });
      toast.present();
  
      // Reset quantity to 1 after adding to cart
      product.quantity = 1;
    } catch (error: any) {
      console.error('Error adding product to cart:', error);
      if (error.error instanceof ErrorEvent) {
        console.error('An error occurred:', error.error.message);
      } else {
        console.error(`Backend returned code ${error.status}, body was:`, error.error);
      }
      
      const errorToast = await this.toastController.create({
        message: 'Error adding product to cart. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      errorToast.present();
    }
  }


  // Navigate to cart page
  navigateToCart() {
    this.navCtrl.navigateForward('/cart');
  }
}
