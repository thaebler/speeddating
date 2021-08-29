import { Component, OnInit } from '@angular/core';
import { SeatingService, Table } from '../seating.service';

@Component({
  selector: 'app-seating-chart',
  templateUrl: './seating-chart.component.html',
  styleUrls: ['./seating-chart.component.css']
})
export class SeatingChartComponent implements OnInit {
  constructor(public seatingService: SeatingService) {
    this.seatingService.tables.subscribe(this.renderTables);
  }

  ngOnInit(): void {}

  onStart(): void {
    this.seatingService.start();
  }

  onRotate(): void {
    this.seatingService.rotate();
  }

  private renderTables(tables: Table[]) {
    console.log('render tables', tables);
  }
}
