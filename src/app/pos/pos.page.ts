import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { PromotionService } from '../services/promotion.service';
import { Camera } from '@capacitor/camera';
import jsQR from 'jsqr';
import { Capacitor } from '@capacitor/core';
import { CameraService } from '../services/camera.service';

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
  discountedPrice?: number;
  hasPromotion?: boolean;
  promotionName?: string;
  canRemove?: boolean;
}

@Component({
  selector: 'app-pos',
  templateUrl: 'pos.page.html',
  styleUrls: ['pos.page.scss'],
})
export class POSPage implements OnInit {
  currentDate = new Date();
  categories: Array<{ name: string, icon: string }> = [];
  selectedCategory = 'All';
  allProducts: Product[] = [];
  products: Product[] = [];
  cart: Product[] = [];
  barcodeInput = '';
  paymentType = '';
  isCheckoutComplete = false;
  amountPaid = 0;
  amountPaidInput = '';
  receiptVisible = false;
  receiptData: any = null;
  userId: string | null = null;
  promotions: any[] = [];
  showPasswordModal = false;
  passwordInput = '';
  passwords = ['pass1', 'pass2', 'pass3', 'pass4', 'pass5'];
  enteredPasswords: string[] = [];
  isRemoveEnabled = false;

  @ViewChild('video', { static: false }) video!: ElementRef;
  @ViewChild('canvas', { static: false }) canvas!: ElementRef;

  canvasElement: any;
  videoElement: any;
  canvasContext: any;
  scanActive = false;

  constructor(
    private alertController: AlertController,
    private http: HttpClient,
    private router: Router,
    private promotionService: PromotionService,
    private modalController: ModalController,
    private cameraService: CameraService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.getUserId();
    this.loadPromotions();
  }

  ngAfterViewInit() {
    this.canvasElement = this.canvas?.nativeElement;
    this.canvasContext = this.canvasElement?.getContext('2d');
    this.videoElement = this.video?.nativeElement;
  }

  async startScan() {
    try {
      const stream = await this.cameraService.startCamera();
      if (this.videoElement) {
        this.videoElement.srcObject = stream;
        this.videoElement.setAttribute('playsinline', true);
        this.videoElement.play();
        this.scanActive = true;
        requestAnimationFrame(this.scan.bind(this));
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      this.showAlert('Camera Error', 'Could not start the camera.');
    }
  }

  async scan() {
    if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasElement.width = this.videoElement.videoWidth;

      this.canvasContext.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      const imageData = this.canvasContext.getImageData(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code) {
        this.scanActive = false;
        this.searchProducts({ target: { value: code.data } });
        await this.cameraService.stopCamera();
      } else if (this.scanActive) {
        requestAnimationFrame(this.scan.bind(this));
      }
    } else if (this.scanActive) {
      requestAnimationFrame(this.scan.bind(this));
    }
  }

  stopScan() {
    this.scanActive = false;
    this.cameraService.stopCamera();
  }

  searchProducts(event: any) {
    const searchTerm = event.target.value.toLowerCase();
    this.filterProducts(searchTerm);
  }

  filterProducts(searchTerm = '') {
    this.products = this.allProducts.filter(
      (product) =>
        (this.selectedCategory === 'All' || product.category === this.selectedCategory) &&
        (product.name.toLowerCase().includes(searchTerm) ||
          product.barcode.toLowerCase().includes(searchTerm))
    );

    const exactMatch = this.allProducts.find(
      (product) => product.barcode.toLowerCase() === searchTerm
    );
    if (exactMatch) {
      this.addToCart(exactMatch);
    }
  }

  async checkCameraPermission(): Promise<boolean> {
    if (Capacitor.getPlatform() === 'web') {
      return true;
    }
    
    const permissions = await Camera.checkPermissions();
    if (permissions.camera === 'denied' || permissions.camera === 'prompt') {
      const permissionRequest = await Camera.requestPermissions();
      return permissionRequest.camera === 'granted';
    }
    return permissions.camera === 'granted';
  }

  getUserId() {
    this.userId = sessionStorage.getItem('userId');
    if (!this.userId) {
      console.warn('User is not logged in');
    }
  }

  loadProducts() {
    this.http.get<Product[]>('http://localhost/user_api/products.php').subscribe({
      next: (data: Product[]) => {
        this.allProducts = data.map((product) => ({
          ...product,
          price: +product.price || 0,
        }));
        this.products = this.allProducts;
        this.extractCategories();
        this.applyPromotions();
      },
      error: (error) => {
        console.error('Error loading products:', error);
      },
    });
  }

  loadPromotions() {
    this.promotionService.getPromotions().subscribe({
      next: (promotions) => {
        this.promotions = promotions.map((promo) => ({
          ...promo,
          discount_percentage: this.ensureValidNumber(promo.discount_percentage),
        }));
        this.applyPromotions();
      },
      error: (error) => {
        console.error('Error loading promotions:', error);
      },
    });
  }

  applyPromotions() {
    this.allProducts.forEach((product) => {
      const promotion = this.promotions.find((p) => p.product_id === product.product_id);
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

 

  onCategoryChange() {
    this.filterProducts();
}

  


addToCart(product: Product) {
  if (isNaN(product.price)) {
    console.warn(`Product ${product.name} has an invalid price`);
    this.showAlert('Invalid Price', `${product.name} has an invalid price.`);
    return;
  }

  const cartItem = this.cart.find(item => item.product_id === product.product_id);
  if (cartItem) {
    if (cartItem.quantity! < product.stock_quantity) {
      cartItem.quantity!++;
    } else {
      this.showAlert('Out of Stock', 'Not enough stock available.');
    }
  } else {
    if (product.stock_quantity > 0) {
      this.cart.push({ ...product, quantity: 1, canRemove: false });
    } else {
      this.showAlert('Out of Stock', 'Product is out of stock.');
    }
  }
}

async removeFromCart(item: Product) {
  if (!item.canRemove) {
    this.showPasswordModal = true;
    return;
  }

  const cartItem = this.cart.find(cartProd => cartProd.barcode === item.barcode);

  if (cartItem && cartItem.quantity! > 1) {
    cartItem.quantity!--;
  } else {
    this.cart = this.cart.filter(cartProd => cartProd.barcode !== item.barcode);
  }
}

async verifyPassword() {
  if (this.passwords.includes(this.passwordInput) && !this.enteredPasswords.includes(this.passwordInput)) {
    this.enteredPasswords.push(this.passwordInput);

    if (this.enteredPasswords.length >= 3) {
      this.isRemoveEnabled = true;
      this.cart.forEach(item => item.canRemove = true);
      await this.showAlert('Success', 'Remove from cart is now enabled for existing items.');
      this.dismissPasswordModal();
    } else {
      await this.showAlert('Password Accepted', `${3 - this.enteredPasswords.length} more password(s) required.`);
    }
  } else {
    await this.showAlert('Invalid Password', 'Please try again.');
  }
  this.passwordInput = '';
}

dismissPasswordModal() {
  this.showPasswordModal = false;
  this.passwordInput = '';
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