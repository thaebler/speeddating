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
  startsAtTable: number;
}

export interface Date {
  tableNumber: number;
  lady?: Participant;
  man?: Participant;
}

export interface DatingEventData {
  dates: Date[];
  medianAgeMen: number;
  medianAgeLadies: number;
  minAge: number;
  maxAge: number;
  noOfMen: number;
  noOfLadies: number;
  dateNumber: number;
  noOfDates: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeatingService {
  _date: DatingEventData = this.emptyState();
  numberOfDates = new BehaviorSubject<number>(10);
  participants = new BehaviorSubject<Participant[]>([]);
  data = new BehaviorSubject<DatingEventData>(this._date);

  private startPosition = 0;
  private position = 0;
  private ladyQueue: Participant[] = [];
  private manQueue: Participant[] = [];
  private static missingPerson: Participant = {
    firstName: '',
    lastName: '',
    gender: Gender.Female,
    age: 0,
    startsAtTable: 0
  };

  constructor() {
    this.participants.subscribe(() => this.start());
    this.numberOfDates.subscribe(() => this.start());
  }

  private emptyState(): DatingEventData {
    return {
      dates: [],
      medianAgeMen: 0,
      medianAgeLadies: 0,
      minAge: 0,
      maxAge: 0,
      noOfMen: 0,
      noOfLadies: 0,
      dateNumber: 0,
      noOfDates: 0
    };
  }

  public start() {
    if (this.participants.value.length === 0) {
      if (this._date.dates.length) {
        this._date = this.emptyState();
        this.data.next(this._date);
      }
      return;
    }
    const ladiesSortedByAge = this.participants.value
      .filter((p) => p.gender === Gender.Female)
      .sort(sortByAge);
    const menSortedByAge = this.participants.value
      .filter((p) => p.gender === Gender.Male)
      .sort(sortByAge);
    const maxNumberOfDates = Math.max(
      ladiesSortedByAge.length,
      menSortedByAge.length
    );
    this._date.noOfDates = Math.min(this.numberOfDates.value, maxNumberOfDates);
    this.position = this.startPosition = Math.ceil(
      0 - this._date.noOfDates / 2
    );
    this._date.medianAgeLadies = medianAge(ladiesSortedByAge);
    this._date.medianAgeMen = medianAge(menSortedByAge);
    this._date.noOfMen = menSortedByAge.length;
    this._date.noOfLadies = ladiesSortedByAge.length;
    const numberOfMissingMen = Math.max(
      ladiesSortedByAge.length - menSortedByAge.length,
      0
    );
    const numberOfMissingLadies = Math.max(
      menSortedByAge.length - ladiesSortedByAge.length,
      0
    );
    this.ladyQueue = [];
    this.manQueue = [];
    if (numberOfMissingMen > 0) {
      if (this._date.medianAgeLadies > this._date.medianAgeMen) {
        const men = [...menSortedByAge];
        for (let i = 0; i < numberOfMissingMen; i++) {
          men.push(SeatingService.missingPerson);
        }
        enqueue(ladiesSortedByAge.reverse(), this.ladyQueue);
        enqueue(men.reverse(), this.manQueue);
      } else {
        const men = [...menSortedByAge];
        for (let i = 0; i < numberOfMissingMen; i++) {
          men.unshift(SeatingService.missingPerson);
        }
        enqueue(ladiesSortedByAge, this.ladyQueue);
        enqueue(men, this.manQueue);
      }
    } else if (numberOfMissingLadies > 0) {
      if (this._date.medianAgeMen > this._date.medianAgeLadies) {
        const ladies = [...ladiesSortedByAge];
        for (let i = 0; i < numberOfMissingLadies; i++) {
          ladies.push(SeatingService.missingPerson);
        }
        enqueue(ladies.reverse(), this.ladyQueue);
        enqueue(menSortedByAge.reverse(), this.manQueue);
      } else {
        const ladies = [...ladiesSortedByAge];
        for (let i = 0; i < numberOfMissingLadies; i++) {
          ladies.unshift(SeatingService.missingPerson);
        }
        enqueue(ladies, this.ladyQueue);
        enqueue(menSortedByAge, this.manQueue);
      }
      // put all missing men to the beginning of the queue
      let rotateQueueByNumber = 0;
      for (let i = this.ladyQueue.length - 1; i >= 0; i--) {
        if (this.ladyQueue[i] === SeatingService.missingPerson) {
          rotateQueueByNumber++;
        } else {
          break;
        }
      }
      rotateQueue(this.manQueue, rotateQueueByNumber);
      rotateQueue(this.ladyQueue, rotateQueueByNumber);
    } else {
      enqueue(ladiesSortedByAge, this.ladyQueue);
      enqueue(menSortedByAge, this.manQueue);
    }

    let tableNumber = 0 - numberOfMissingLadies;
    this._date.dates = this.ladyQueue.map((lady) => {
      tableNumber++;
      if (lady === SeatingService.missingPerson) {
        return {
          tableNumber
        };
      }
      lady.startsAtTable = tableNumber;
      return {
        lady,
        tableNumber: tableNumber
      };
    });
    this._date.minAge = Math.min(
      menSortedByAge[0]?.age || 100,
      ladiesSortedByAge[0]?.age || 100
    );
    this._date.maxAge = Math.max(
      menSortedByAge[menSortedByAge.length - 1]?.age || 0,
      ladiesSortedByAge[ladiesSortedByAge.length - 1]?.age || 0
    );

    this.assignSeats();

    this._date.dates.forEach((date) => {
      if (date.man) {
        date.man.startsAtTable = date.tableNumber;
      }
    });

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

    function rotateQueue(queue: Participant[], amount: number) {
      const end = queue.splice(queue.length - amount);
      queue.unshift(...end);
    }
  }

  public rotate() {
    this.position++;
    if (this.position - this.startPosition >= this._date.noOfDates) {
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

    this._date.dates.forEach((date, index) => {
      const man = currentSeatingOfMen[index];
      if (man === SeatingService.missingPerson) {
        delete date.man;
      } else {
        date.man = currentSeatingOfMen[index];
      }
    });
    this._date.dateNumber = this.position - this.startPosition + 1;
    this.data.next(this._date);
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
