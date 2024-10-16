import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShippingMethodPage } from './shipping-method.page';

describe('ShippingMethodPage', () => {
  let component: ShippingMethodPage;
  let fixture: ComponentFixture<ShippingMethodPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShippingMethodPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
