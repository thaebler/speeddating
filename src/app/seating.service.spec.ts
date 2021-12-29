import { TestBed } from '@angular/core/testing';
import { SeatingService } from './seating.service';

describe('SeatingService', () => {
  let service: SeatingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeatingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // it('fill gaps in case of too many men', () => {
  //   service.participants.next(moreMen);
  //   expect(service.data.value.numberOfMissingMen).toBe(0);
  //   expect(service.data.value.numberOfMissingLadies).toBe(13);
  // });
});
