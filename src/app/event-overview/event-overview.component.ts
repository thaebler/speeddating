import { Component } from '@angular/core';
import { DatingEventData, SeatingService } from '../seating.service';

@Component({
  selector: 'app-event-overview',
  templateUrl: './event-overview.component.html',
  styleUrls: ['./event-overview.component.css']
})
export class EventOverviewComponent {
  overview!: DatingEventData;

  constructor(public seatingService: SeatingService) {
    seatingService.data.subscribe((overview) => {
      this.overview = overview;
    });
  }

  noOfDatesChange(event: any) {
    const maxNumberOfDates = Math.max(
      this.overview.noOfLadies,
      this.overview.noOfMen
    );
    this.seatingService.numberOfDates.next(
      Math.min(event.value, maxNumberOfDates)
    );
  }
}
