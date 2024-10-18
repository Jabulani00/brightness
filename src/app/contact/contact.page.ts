import { Component } from '@angular/core';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.scss'],
})
export class ContactPage {
  name: string="";
  email: string="";
  message: string="";

  constructor() {}

  onSubmit() {
    console.log('Form submitted', { name: this.name, email: this.email, message: this.message });
    // Here you would typically send the form data to your backend
  }
}
