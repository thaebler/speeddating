import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-seating-chart',
  templateUrl: './seating-chart.component.html',
  styleUrls: ['./seating-chart.component.css']
})
export class SeatingChartComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {}

  onStart(): void {
    console.log('Start');
  }

  onRotate(): void {
    console.log('Rotate');
  }
}
