import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminUserManagementPage } from './admin-user-management.page';

describe('AdminUserManagementPage', () => {
  let component: AdminUserManagementPage;
  let fixture: ComponentFixture<AdminUserManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminUserManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
