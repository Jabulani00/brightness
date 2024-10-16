import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminInventoryManagementPage } from './admin-inventory-management.page';

describe('AdminInventoryManagementPage', () => {
  let component: AdminInventoryManagementPage;
  let fixture: ComponentFixture<AdminInventoryManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminInventoryManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
