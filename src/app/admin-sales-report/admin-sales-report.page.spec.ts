import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminSalesReportPage } from './admin-sales-report.page';

describe('AdminSalesReportPage', () => {
  let component: AdminSalesReportPage;
  let fixture: ComponentFixture<AdminSalesReportPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminSalesReportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
