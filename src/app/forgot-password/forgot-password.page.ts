import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
})
export class ForgotPasswordPage {
  email: string = '';
  username: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  showPasswordFields: boolean = false;

  constructor(
    private http: HttpClient,
    private alertController: AlertController
  ) {}

  async verifyUser(event: Event) {
    event.preventDefault();

    // POST request to verify user
    this.http.post('http://localhost/user_api/verify_user.php', { email: this.email, username: this.username })
      .subscribe(
        async (response: any) => {
          if (response.status === 1) {
            this.showPasswordFields = true;
          } else {
            await this.showAlert('Error', 'Email and username do not match.');
          }
        },
        async (error) => {
          await this.showAlert('Error', 'Something went wrong.');
        }
      );
  }

  async resetPassword(event: Event) {
    event.preventDefault();

    if (this.newPassword !== this.confirmPassword) {
      await this.showAlert('Error', 'Passwords do not match.');
      return;
    }

    // POST request to reset password
    this.http.post('http://localhost/user_api/reset_password.php', {
      email: this.email,
      username: this.username,
      newPassword: this.newPassword
    })
      .subscribe(
        async (response: any) => {
          if (response.status === 1) {
            await this.showAlert('Success', 'Password has been reset successfully.');
            // Reset form and hide password fields
            this.email = '';
            this.username = '';
            this.newPassword = '';
            this.confirmPassword = '';
            this.showPasswordFields = false;
          } else {
            await this.showAlert('Error', response.message);
          }
        },
        async (error) => {
          await this.showAlert('Error', 'Something went wrong.');
        }
      );
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
    });
    await alert.present();
  }
}