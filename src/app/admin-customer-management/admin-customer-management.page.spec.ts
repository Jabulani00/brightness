import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminCustomerManagementPage } from './admin-customer-management.page';

describe('AdminCustomerManagementPage', () => {
  let component: AdminCustomerManagementPage;
  let fixture: ComponentFixture<AdminCustomerManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminCustomerManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
