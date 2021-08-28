import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeatingChartComponent } from './seating-chart.component';

describe('SeatingChartComponent', () => {
  let component: SeatingChartComponent;
  let fixture: ComponentFixture<SeatingChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SeatingChartComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SeatingChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
