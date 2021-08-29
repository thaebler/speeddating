import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum Gender {
  Male = 'Male',
  Female = 'Female'
}

export interface Participant {
  firstName: string;
  lastName: string;
  gender: Gender;
  age: number;
}

export interface Date {
  tableNumber: number;
  lady?: Participant;
  man?: Participant;
}

export interface SeatingOverview {
  dates: Date[];
  medianAgeMen: number;
  medianAgeLadies: number;
  minAge: number;
  maxAge: number;
  numberOfMissingMen: number;
  numberOfMissingLadies: number;
  dateNumber: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeatingService {
  _state: SeatingOverview = {
    dates: [],
    medianAgeMen: 0,
    medianAgeLadies: 0,
    minAge: 0,
    maxAge: 0,
    numberOfMissingMen: 0,
    numberOfMissingLadies: 0,
    dateNumber: 0
  };
  numberOfDates = new BehaviorSubject<number>(10);
  participants = new BehaviorSubject<Participant[]>([]);
  state = new BehaviorSubject<SeatingOverview>(this._state);

  private startPosition = 0;
  private position = 0;
  private ladyQueue: Participant[] = [];
  private manQueue: Participant[] = [];
  private static missingMan: Participant = {
    firstName: '',
    lastName: '',
    gender: Gender.Male,
    age: 0
  };
  private static missingLady: Participant = {
    firstName: '',
    lastName: '',
    gender: Gender.Female,
    age: 0
  };

  constructor() {
    this.participants.subscribe(() => this.start());
    this.numberOfDates.subscribe(() => this.start());
  }

  public start() {
    if (this.participants.value.length === 0) {
      if (this._state.dates.length) {
        this._state.dates = [];
        this.state.next(this._state);
      }
      return;
    }
    this.position = this.startPosition = Math.ceil(
      0 - this.numberOfDates.value / 2
    );
    const ladiesSortedByAge = this.participants.value
      .filter((p) => p.gender === Gender.Female)
      .sort(sortByAge);
    const menSortedByAge = this.participants.value
      .filter((p) => p.gender === Gender.Male)
      .sort(sortByAge);
    this._state.medianAgeLadies = medianAge(ladiesSortedByAge);
    this._state.medianAgeMen = medianAge(menSortedByAge);
    this._state.numberOfMissingMen =
      ladiesSortedByAge.length - menSortedByAge.length;
    this._state.numberOfMissingLadies = -this._state.numberOfMissingMen;
    this.ladyQueue = [];
    this.manQueue = [];
    if (this._state.numberOfMissingMen > 0) {
      this._state.numberOfMissingLadies = 0;
      if (this._state.medianAgeLadies > this._state.medianAgeMen) {
        const men = [...menSortedByAge];
        for (let i = 0; i < this._state.numberOfMissingMen; i++) {
          men.push(SeatingService.missingMan);
        }
        enqueue(ladiesSortedByAge.reverse(), this.ladyQueue);
        enqueue(men.reverse(), this.manQueue);
      } else {
        const men = [...menSortedByAge];
        for (let i = 0; i < this._state.numberOfMissingMen; i++) {
          men.unshift(SeatingService.missingMan);
        }
        enqueue(ladiesSortedByAge, this.ladyQueue);
        enqueue(men, this.manQueue);
      }
    } else if (this._state.numberOfMissingLadies > 0) {
      this._state.numberOfMissingMen = 0;
      if (this._state.medianAgeMen > this._state.medianAgeLadies) {
        const ladies = [...ladiesSortedByAge];
        for (let i = 0; i < this._state.numberOfMissingLadies; i++) {
          ladies.push(SeatingService.missingLady);
        }
        enqueue(ladies.reverse(), this.ladyQueue);
        enqueue(menSortedByAge.reverse(), this.manQueue);
      } else {
        const ladies = [...ladiesSortedByAge];
        for (let i = 0; i < this._state.numberOfMissingLadies; i++) {
          ladies.unshift(SeatingService.missingLady);
        }
        enqueue(ladies, this.ladyQueue);
        enqueue(menSortedByAge, this.manQueue);
      }
    } else {
      enqueue(ladiesSortedByAge, this.ladyQueue);
      enqueue(menSortedByAge, this.manQueue);
    }

    let tableNumber = 1;
    this._state.dates = this.ladyQueue.map((lady) => {
      if (lady === SeatingService.missingLady) {
        return {
          tableNumber: -1
        };
      }
      return {
        lady,
        tableNumber: tableNumber++
      };
    });
    this._state.minAge = Math.min(
      menSortedByAge[0].age,
      ladiesSortedByAge[0].age
    );
    this._state.maxAge = Math.max(
      menSortedByAge[menSortedByAge.length - 1].age,
      ladiesSortedByAge[ladiesSortedByAge.length - 1].age
    );

    this.assignSeats();

    function enqueue(sortedByAge: Participant[], queue: Participant[]) {
      sortedByAge.forEach((participant, sortedIndex) => {
        const insertAtBeginning = sortedIndex % 2 === 0;
        const distanceFromBeginOrEnd = Math.floor(sortedIndex / 2);
        const indexInQueue = insertAtBeginning
          ? distanceFromBeginOrEnd
          : sortedByAge.length - distanceFromBeginOrEnd - 1;
        queue[indexInQueue] = participant;
      });
    }
  }

  public rotate() {
    this.position++;
    if (this.position - this.startPosition >= this.numberOfDates.value) {
      this.position = this.startPosition;
    }
    this.assignSeats();
  }

  private assignSeats() {
    const numberOfMen = this.manQueue.length;

    const currentSeatingOfMen: Participant[] = [];
    this.manQueue.forEach((man, index) => {
      const position = index + this.position;
      const tableIndex =
        position < 0
          ? position + numberOfMen
          : position >= numberOfMen
          ? position - numberOfMen
          : position;
      currentSeatingOfMen[tableIndex] = man;
    });

    this._state.dates.forEach((date, index) => {
      const man = currentSeatingOfMen[index];
      if (man === SeatingService.missingMan) {
        delete date.man;
      } else {
        date.man = currentSeatingOfMen[index];
      }
    });
    this._state.dateNumber = this.position - this.startPosition;
    this.state.next(this._state);
  }
}

function sortByAge(a: Participant, b: Participant): number {
  if (a.age < b.age) {
    return -1;
  }
  if (a.age > b.age) {
    return 1;
  }
  return 0;
}

function medianAge(participants: Participant[]): number {
  const ages = participants.map((participant) => participant.age);
  const mid = Math.ceil(ages.length / 2);
  return ages.length % 2 == 0 ? (ages[mid] + ages[mid - 1]) / 2 : ages[mid - 1];
}
