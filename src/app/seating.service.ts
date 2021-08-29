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

export interface Table {
  tableIndex: number;
  lady: Participant;
  man?: Participant;
}

@Injectable({
  providedIn: 'root'
})
export class SeatingService {
  numberOfDates = new BehaviorSubject<number>(10);
  participants = new BehaviorSubject<Participant[]>([]);
  tables = new BehaviorSubject<Table[]>([]);
  medianAgeMen = new BehaviorSubject<number>(0);
  medianAgeLadies = new BehaviorSubject<number>(0);

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
  private _tables: Table[] = [];
  private numberOfMissingMen = 0;
  private numberOfMissingLadies = 0;
  private takingABreak: Participant[] = [];

  constructor() {
    this.participants.subscribe(() => this.start());
    this.numberOfDates.subscribe(() => this.start());
  }

  public start() {
    if (this.participants.value.length === 0) {
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
    this.medianAgeLadies.next(medianAge(ladiesSortedByAge));
    this.medianAgeMen.next(medianAge(menSortedByAge));
    this.numberOfMissingMen = ladiesSortedByAge.length - menSortedByAge.length;
    this.numberOfMissingLadies = -this.numberOfMissingMen;
    this._tables = ladiesSortedByAge.map((lady, index) => {
      return {
        lady,
        tableIndex: index
      };
    });
    if (this.numberOfMissingMen > 0) {
      this.numberOfMissingLadies = 0;
      if (this.medianAgeLadies > this.medianAgeMen) {
        for (let i = 0; i < this.numberOfMissingMen; i++) {
          menSortedByAge.push(SeatingService.missingMan);
        }
        enqueue(ladiesSortedByAge.reverse(), this.ladyQueue);
        enqueue(menSortedByAge.reverse(), this.manQueue);
      } else {
        for (let i = 0; i < this.numberOfMissingMen; i++) {
          menSortedByAge.unshift(SeatingService.missingMan);
        }
        enqueue(ladiesSortedByAge, this.ladyQueue);
        enqueue(menSortedByAge, this.manQueue);
      }
    } else if (this.numberOfMissingLadies > 0) {
      this.numberOfMissingMen = 0;
      if (this.medianAgeMen > this.medianAgeLadies) {
        enqueue(ladiesSortedByAge.reverse(), this.ladyQueue);
        enqueue(menSortedByAge.reverse(), this.manQueue);
      } else {
        enqueue(ladiesSortedByAge, this.ladyQueue);
        enqueue(menSortedByAge, this.manQueue);
      }
    } else {
      enqueue(ladiesSortedByAge, this.ladyQueue);
      enqueue(menSortedByAge, this.manQueue);
    }

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
    const numberOfTables = this._tables.length;

    const currentSeatingOfMen: Participant[] = [];
    this.manQueue.forEach((man, index) => {
      const position = index + this.position;
      const tableIndex =
        position < 0
          ? position + numberOfTables
          : position >= numberOfTables
          ? position - numberOfTables
          : position;
      currentSeatingOfMen[tableIndex] = man;
    });

    this.takingABreak = [];
    for (let i = 0; i < this.numberOfMissingLadies; i++) {
      const removeAtBeginning = i % 2 === 0;
      if (removeAtBeginning) {
        this.takingABreak.push(currentSeatingOfMen.shift() as Participant);
      } else {
        this.takingABreak.push(currentSeatingOfMen.pop() as Participant);
      }
    }

    this._tables.forEach((table, index) => {
      const man = currentSeatingOfMen[index];
      if (man === SeatingService.missingMan) {
        this.takingABreak.push(table.lady);
      } else {
        table.man = currentSeatingOfMen[index];
      }
    });
    this.tables.next(this._tables);
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
