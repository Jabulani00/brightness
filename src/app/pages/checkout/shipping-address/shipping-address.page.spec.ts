import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShippingAddressPage } from './shipping-address.page';

describe('ShippingAddressPage', () => {
  let component: ShippingAddressPage;
  let fixture: ComponentFixture<ShippingAddressPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShippingAddressPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
