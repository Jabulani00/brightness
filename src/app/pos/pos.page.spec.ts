import { ComponentFixture, TestBed } from '@angular/core/testing';
import { POSPage } from './pos.page';

describe('POSPage', () => {
  let component: POSPage;
  let fixture: ComponentFixture<POSPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(POSPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
