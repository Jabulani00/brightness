import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminOrderManagementPage } from './admin-order-management.page';

describe('AdminOrderManagementPage', () => {
  let component: AdminOrderManagementPage;
  let fixture: ComponentFixture<AdminOrderManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminOrderManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
