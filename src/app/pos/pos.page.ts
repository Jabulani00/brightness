import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { PromotionService } from '../services/promotion.service'; 

interface Product {
  id: any;
  product_id: number;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: string;
  barcode: string;
  image_url: string;
  total_ratings: number;
  average_rating: number;
  created_at: string;
  updated_at: string;
  quantity?: number;
  discountedPrice?: number; // Add this property
  hasPromotion?: boolean; // Add this property
  promotionName?: string; // Add this property
}


@Component({
  selector: 'app-pos',
  templateUrl: 'pos.page.html',
  styleUrls: ['pos.page.scss'],
})
export class POSPage implements OnInit {
  currentDate = new Date();
  categories: Array<{ name: string, icon: string }> = [];
  selectedCategory: string = 'All';
  allProducts: Product[] = [];
  products: Product[] = [];
  cart: Product[] = [];
  barcodeInput: string = '';
  paymentType: string = '';
  isCheckoutComplete: boolean = false;
  amountPaid: number = 0;
  amountPaidInput: string = '';
  receiptVisible: boolean = false;
  receiptData: any = null;
  cartItems: any[] = [];
  userId: string | null = null;
  promotions: any[] = [];


  constructor(private alertController: AlertController,
              private http: HttpClient,
              private router: Router,
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

  loadProducts() {
    this.http.get<Product[]>('http://localhost/user_api/products.php').subscribe({
      next: (data: Product[]) => {
        this.allProducts = data.map(product => ({
          ...product,
          price: +product.price || 0
        }));
        this.products = this.allProducts;
        this.extractCategories();
        this.applyPromotions();
        console.log('Products loaded:', this.products);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading products:', error);
      }
    });
  }

  loadPromotions() {
    this.promotionService.getPromotions().subscribe({
      next: (promotions) => {
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
    this.allProducts.forEach(product => {
      const promotion = this.promotions.find(p => p.product_id === product.product_id);
      if (promotion) {
        const discountAmount = product.price * (promotion.discount_percentage / 100);
        product.discountedPrice = this.roundToTwo(product.price - discountAmount);
        product.hasPromotion = true;
        product.promotionName = promotion.name;
      } else {
        product.discountedPrice = product.price;
        product.hasPromotion = false;
      }
    });
    this.updateCartWithPromotions();
  }

  updateCartWithPromotions() {
    this.cart.forEach(item => {
      const product = this.allProducts.find(p => p.product_id === item.product_id);
      if (product) {
        item.discountedPrice = product.discountedPrice;
        item.hasPromotion = product.hasPromotion;
        item.promotionName = product.promotionName;
      }
    });
  }

  ensureValidNumber(value: any): number {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  }

  roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

async purchaseProducts() {
  try {
    if (!this.userId) {
      await this.showAlert('Error', 'User is not logged in. Please log in to complete the purchase.');
      return;
    }

    if (this.cart.length === 0) {
      await this.showAlert('Error', 'Your cart is empty. Please add items before checking out.');
      return;
    }

    // Check stock availability before proceeding
    const outOfStockItems = this.cart.filter(item => item.quantity! > item.stock_quantity);
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.name).join(', ');
      await this.showAlert('Insufficient Stock', `The following items do not have enough stock: ${itemNames}`);
      return;
    }

    const orderData = {
      user_id: this.userId,
      total_amount: this.getTotal(),
      discounted_amount: this.getSubtotal(),
      order_type: "walk-in",
      status: 'checked-out',
      items: this.cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        discounted_price: item.discountedPrice
      }))
    };

    const orderResponse = await this.http.post<{ success: boolean, message: string, order_id: number }>(
      'http://localhost/user_api/orders.php',
      orderData
    ).toPromise();

    if (!orderResponse || !orderResponse.success || !orderResponse.order_id) {
      throw new Error(orderResponse?.message || 'Failed to create order or retrieve order ID');
    }

    const orderId = orderResponse.order_id;

    const saleData = {
      order_id: orderId,
      cashier_id: this.userId,
      total_amount: this.getTotal(),
      payment_method: this.paymentType,
      amount_paid: this.paymentType === 'cash' ? parseFloat(this.amountPaidInput) : this.getTotal()
    };

    const saleResponse = await this.http.post<{ success: boolean, message: string, sale_id: number }>(
      'http://localhost/user_api/sales.php',
      saleData
    ).toPromise();

    if (!saleResponse || !saleResponse.success) {
      throw new Error(saleResponse?.message || 'Failed to record sale');
    }

    // Update stock quantities
    const stockUpdateRequests: Observable<any>[] = this.cart.map(item => 
      this.http.put(`http://localhost/user_api/update_stock.php`, {
        product_id: item.product_id,
        quantity: item.stock_quantity - item.quantity!
      })
    );

    forkJoin(stockUpdateRequests).subscribe({
      next: (responses) => {
        console.log('Stock updates completed', responses);
        this.updateLocalStock();
      },
      error: (error) => {
        console.error('Error updating stock:', error);
        // Consider how to handle partial stock updates or rollback in case of errors
      }
    });

    await this.showAlert('Transaction Complete', `Thank you for your purchase! Order ID: ${orderId}`);
    this.completeTransaction();

  } catch (error) {
    console.error('Error completing transaction:', error);
    if (error instanceof HttpErrorResponse) {
      console.error('Error details:', error.error);
    }
    await this.showAlert('Error', 'There was an error completing the transaction. Please try again.');
  }
}

updateLocalStock() {
  this.cart.forEach(cartItem => {
    const productIndex = this.allProducts.findIndex(p => p.product_id === cartItem.product_id);
    if (productIndex !== -1) {
      this.allProducts[productIndex].stock_quantity -= cartItem.quantity!;
    }
  });
  this.products = [...this.allProducts]; // Trigger change detection
}

viewAccount() {
  this.router.navigate(['/account']);
  console.log('Navigating to account page');
  // Add navigation logic here
}

viewOrders() {
  this.router.navigate(['/cashier']);
  console.log('Navigating to account page');
  // Add navigation logic here
}


resetCart() {
  this.cart = [];
  this.paymentType = '';
  this.amountPaidInput = '';
  this.isCheckoutComplete = true;
}

  extractCategories() {
    const categorySet = new Set(this.allProducts.map(product => product.category || 'Other'));
    this.categories = [{ name: 'All', icon: 'grid' }, 
      ...Array.from(categorySet).map(category => ({ name: category, icon: this.getCategoryIcon(category) }))
    ];
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'Cleaning Chemicals': return 'flask';
      case 'Cleaning Tools': return 'brush';
      case 'Equipment': return 'construct';
      case 'Paper & Disposables': return 'newspaper';
      default: return 'pricetag';
    }
  }

  searchProducts(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filterProducts(searchTerm);
  }

  onCategoryChange() {
    this.filterProducts();
}

  filterProducts(searchTerm: string = '') {
    this.products = this.allProducts.filter(product =>
      (this.selectedCategory === 'All' || product.category === this.selectedCategory) &&
      (product.name.toLowerCase().includes(searchTerm) || product.barcode.includes(searchTerm))
    );
}


addToCart(product: Product) {
  if (isNaN(product.price)) {
      console.warn(`Product ${product.name} has an invalid price`);
      this.showAlert('Invalid Price', `${product.name} has an invalid price.`);
      return;
  }

  // Proceed with adding to the cart if price is valid
  const cartItem = this.cart.find(item => item.product_id === product.product_id);
  if (cartItem) {
      if (cartItem.quantity! < product.stock_quantity) {
          cartItem.quantity!++;
      } else {
          this.showAlert('Out of Stock', 'Not enough stock available.');
      }
  } else {
      if (product.stock_quantity > 0) {
          this.cart.push({ ...product, quantity: 1 });
      } else {
          this.showAlert('Out of Stock', 'Product is out of stock.');
      }
  }
}


  removeFromCart(item: Product) {
    const cartItem = this.cart.find(cartProd => cartProd.barcode === item.barcode);

    if (cartItem && cartItem.quantity! > 1) {
      cartItem.quantity!--;
    } else {
      this.cart = this.cart.filter(cartProd => cartProd.barcode !== item.barcode);
    }
  }

  getSubtotal() {
    return this.roundToTwo(
      this.cart.reduce((sum, item) => sum + (item.discountedPrice! * item.quantity!), 0)
    );
  }

  getTax() {
    return this.roundToTwo(this.getSubtotal() * 0.15); // Assuming 15% VAT
  }

  getTotal() {
    return this.roundToTwo(this.getSubtotal() + this.getTax());
  }

  async checkout() {
    if (!this.paymentType) {
      await this.showAlert('Payment Type Required', 'Please select a payment type before checkout.');
      return;
    }
  
    if (this.paymentType === 'cash') {
      if (!this.amountPaidInput) {
        await this.showAlert('Amount Required', 'Please enter the amount paid for cash transactions.');
        return;
      }
      await this.handleCashPayment();
    } else {
      await this.showCheckoutAlert();
    }
  }
  
  

  async handleCashPayment() {
    this.amountPaid = parseFloat(this.amountPaidInput);
    const total = this.getTotal();
    if (this.amountPaid < total) {
      await this.showAlert('Insufficient Amount', 'The amount paid is less than the total due.');
      return;
    }
  
    const change = this.amountPaid - total;
  
    const alert = await this.alertController.create({
      header: 'Checkout',
      message: `
        Total: R${total.toFixed(2)}
<br>
        Amount Paid: R${this.amountPaid.toFixed(2)}
<br>
        Change: R${change.toFixed(2)}
      `,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => {
            this.purchaseProducts();
          }
        }
      ]
    });
  
    await alert.present();
  }
  
  // Method to show the checkout alert for non-cash payments
  async showCheckoutAlert() {
    const total = this.getTotal();
  
    const alert = await this.alertController.create({
      header: 'Checkout',
      message: `Total: R${total.toFixed(2)}`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: () => {
            this.purchaseProducts();
          }
        }
      ]
    });
  
    await alert.present();
  }

  
  
  completeTransaction() {
    this.prepareReceiptData();
    this.isCheckoutComplete = true;
    this.cart = [];
    this.paymentType = '';
    this.amountPaidInput = '';
    this.printReceipt(); // Automatically show the receipt after transaction completion
  }

  prepareReceiptData() {
    const total = this.getTotal();
    const amountPaid = this.paymentType === 'cash' ? parseFloat(this.amountPaidInput) : total;
    const change = this.paymentType === 'cash' ? amountPaid - total : 0;
    
    this.receiptData = {
      date: new Date().toLocaleString(),
      cashier: 'John Doe',
      cashierId: '12345',
      items: [...this.cart],
      subtotal: this.getSubtotal(),
      tax: this.getTax(),
      total: total,
      paymentType: this.paymentType,
      amountPaid: amountPaid,
      change: change
    };
  }
  

  // hideReceipt() {
  //   this.receiptVisible = false;
  //   this.receiptData = null;
  // }


  onBarcodeEnter() {
    const product = this.allProducts.find(p => p.barcode === this.barcodeInput);
    if (product) {
      this.addToCart(product);
      this.barcodeInput = '';
    } else {
      this.showAlert('Invalid Barcode', 'No product found with this barcode.');
    }
  }

 printReceipt() {
    if (!this.isCheckoutComplete) {
      this.showAlert('Cannot Print Receipt', 'Please complete the checkout process before printing the receipt.');
      return;
    }
    this.receiptVisible = true;
  }

  hideReceipt() {
    this.receiptVisible = false;
  }
  
  appendToNumpad(value: string) {
    if (value === 'C') {
      this.clearNumpad();
    } else if (value === 'Enter') {
      this.onBarcodeEnter();
    } else {
      // Check if the payment type is cash and append to amountPaidInput
      if (this.paymentType === 'cash') {
        this.amountPaidInput += value; // Append the value to the amount paid
      } else {
        this.barcodeInput += value; // Append to barcode input
      }
    }
  }

  clearNumpad() {
    // Clear the appropriate input based on payment type
    if (this.paymentType === 'cash') {
      this.amountPaidInput = ''; // Clear amount paid input
    } else {
      this.barcodeInput = ''; // Clear barcode input
    }
  }
  
  submitNumpad() {
    if (this.isCheckoutComplete) {
      this.handleCashPayment();  // Handle the payment when "Enter" is pressed during checkout
    } else {
      this.onBarcodeEnter();     // Handle barcode entry
    }
  }
  

  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}