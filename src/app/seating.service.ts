import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export enum Gender {
  Male = 'Male',
  Female = 'Female'
}

export interface Participant {
  firstName: string;
  lastName: string;
  nickName: string;
  gender: Gender;
  age: number;
  startsAtTable: number;
  startsWithBreak?: boolean;
  nogos: Participant[];
  meetsAgeRange: string;
}

export interface Date {
  tableNumber?: number;
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
  numberOfMissingMen: number;
  numberOfMissingLadies: number;
}

@Injectable({
  providedIn: 'root'
})
export class SeatingService {
  _data: DatingEventData = this.emptyState();
  numberOfDates = new BehaviorSubject<number>(10);
  participants = new BehaviorSubject<Participant[]>([]);
  data = new BehaviorSubject<DatingEventData>(this._data);

  private startPosition = 0;
  private position = 0;
  private ladyQueue: Participant[] = [];
  private manQueue: Participant[] = [];
  private static missingPerson: Participant = {
    firstName: '',
    lastName: '',
    nickName: '',
    nogos: [],
    gender: Gender.Female,
    age: 0,
    startsAtTable: 0,
    meetsAgeRange: ''
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
      noOfDates: 0,
      numberOfMissingLadies: 0,
      numberOfMissingMen: 0
    };
  }

  public start() {
    if (this.participants.value.length === 0) {
      if (this._data.dates.length) {
        this._data = this.emptyState();
        this.data.next(this._data);
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
    this._data.noOfDates = Math.min(this.numberOfDates.value, maxNumberOfDates);
    this._data.numberOfMissingMen = Math.max(
      ladiesSortedByAge.length - menSortedByAge.length,
      0
    );
    this._data.numberOfMissingLadies = Math.max(
      menSortedByAge.length - ladiesSortedByAge.length,
      0
    );
    this.position = this.startPosition = Math.ceil(
      0 - this._data.noOfDates / 2
    );
    this._data.medianAgeLadies = medianAge(ladiesSortedByAge);
    this._data.medianAgeMen = medianAge(menSortedByAge);
    this._data.noOfMen = menSortedByAge.length;
    this._data.noOfLadies = ladiesSortedByAge.length;
    this._data.minAge = Math.min(
      menSortedByAge[0]?.age || 100,
      ladiesSortedByAge[0]?.age || 100
    );
    this._data.maxAge = Math.max(
      menSortedByAge[menSortedByAge.length - 1]?.age || 0,
      ladiesSortedByAge[ladiesSortedByAge.length - 1]?.age || 0
    );

    this.initQueues(ladiesSortedByAge, menSortedByAge);
    this.applySpecialRules();
    this.showAgeRangeOfDates();

    let tableNumber = 0;
    this._data.dates = this.ladyQueue.map((lady) => {
      if (lady === SeatingService.missingPerson) {
        return {};
      }
      tableNumber++;
      lady.startsAtTable = tableNumber;
      return {
        lady,
        tableNumber: tableNumber
      };
    });

    this.assignSeats();

    tableNumber = 0;
    this._data.dates.forEach((date) => {
      if (date.man) {
        if (date.tableNumber) {
          tableNumber = date.tableNumber;
          date.man.startsWithBreak = false;
          date.man.startsAtTable = date.tableNumber;
        } else {
          date.man.startsWithBreak = true;
          date.man.startsAtTable = tableNumber + 1;
        }
      }
      if (date.lady) {
        date.lady.startsWithBreak = !date.man;
      }
    });
  }

  public rotate() {
    this.position++;
    if (this.position - this.startPosition >= this._data.noOfDates) {
      this.position = this.startPosition;
    }
    this.assignSeats();
  }

  public updateNogoRuleFor(
    person: Participant,
    oldNogoList: Participant[],
    newNogoList: Participant[]
  ) {
    person.nogos = newNogoList.map((nogo) => {
      // also update the nogo's list
      if (!nogo.nogos.includes(person)) {
        nogo.nogos.push(person);
      }
      return nogo;
    });
    const removedNogos = oldNogoList.filter((nogo) => {
      return !newNogoList.includes(nogo);
    });
    removedNogos.forEach((nogo) => {
      const index = nogo.nogos.indexOf(person);
      if (index > -1) {
        nogo.nogos.splice(index, 1);
      }
    });
  }

  public addNogoRuleFor(
    nickName: string,
    nogoList: string[],
    participants = this.participants.value
  ) {
    const person = participants.find((p) => p.nickName === nickName);
    if (person) {
      const nogos = nogoList.map((nogoName) => {
        const nogo = participants.find((p) => p.nickName === nogoName);
        if (nogo) {
          // also update the nogo's list
          if (!nogo.nogos.includes(person)) {
            nogo.nogos.push(person);
          }
          return nogo;
        } else {
          throw new Error(`Could not find nickname ${nogoName}`);
        }
      });
      const addedNogos = nogos.filter((nogoName) => {
        return !person.nogos.includes(nogoName);
      });
      person.nogos.push(...addedNogos);
    } else {
      throw new Error(`Could not find nickname ${nickName}`);
    }
  }

  private initQueues(
    ladiesSortedByAge: Participant[],
    menSortedByAge: Participant[]
  ) {
    this.ladyQueue = [];
    this.manQueue = [];
    enqueue(ladiesSortedByAge, this.ladyQueue);
    enqueue(menSortedByAge, this.manQueue);
    if (this._data.numberOfMissingMen > 0) {
      fillMissingPerson(
        this.manQueue,
        this._data.numberOfMissingMen,
        this._data.noOfMen / this._data.numberOfMissingMen
      );
    } else if (this._data.numberOfMissingLadies > 0) {
      fillMissingPerson(
        this.ladyQueue,
        this._data.numberOfMissingLadies,
        this._data.noOfLadies / this._data.numberOfMissingLadies
      );
    }

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

    function fillMissingPerson(
      person: Participant[],
      amount: number,
      gap: number
    ) {
      for (let i = 0; i < amount; i++) {
        const index = Math.floor(i + i * gap);
        person.splice(index, 0, SeatingService.missingPerson);
      }
    }
  }

  private applySpecialRules() {
    const moved: Participant[] = [];
    this.participants.value.forEach((person) =>
      this.applyNogoRuleFor(person, moved)
    );
  }

  private applyNogoRuleFor(person: Participant, moved: Participant[]) {
    if (person.nogos.length > 0) {
      const otherQueue =
        person.gender === Gender.Female ? this.manQueue : this.ladyQueue;
      const meetsWith = this.findMyDates(person);
      person.nogos.forEach((nogo) => {
        if (meetsWith.includes(nogo)) {
          console.log(
            `Oh no, ${person.nickName} meets ${nogo.nickName}, find someone else...`
          );
          const potentialReplacements = otherQueue.filter((other) => {
            return !meetsWith.includes(other) && !moved.includes(other);
          });
          let replacement = potentialReplacements.find(
            (r) => r.age === nogo.age
          );
          if (!replacement) {
            replacement = potentialReplacements.find(
              (r) => Math.abs(r.age - nogo.age) <= 1
            );
          }
          if (replacement) {
            const otherIndex = otherQueue.findIndex((r) => r === replacement);
            const nogoIndex = otherQueue.findIndex((r) => r === nogo);
            otherQueue[otherIndex] = nogo;
            otherQueue[nogoIndex] = replacement;
            moved.push(nogo);
            moved.push(replacement);
            console.log(`--> found replacement ${replacement.nickName}`);
          } else {
            console.log(`--> could not find a replacement...`);
          }
        }
      });
    }
  }

  private findMyDates(person: Participant): Participant[] {
    const myQueue =
      person.gender === Gender.Female ? this.ladyQueue : this.manQueue;
    const otherQueue =
      person.gender === Gender.Female ? this.manQueue : this.ladyQueue;
    const myIndexInQueue = myQueue.findIndex(
      (p) => p.nickName === person.nickName
    );
    const meetsWith: Participant[] = [];
    const queueLength = myQueue.length;
    for (
      let i = this.startPosition;
      i < this.startPosition + this._data.noOfDates;
      i++
    ) {
      const position =
        myIndexInQueue +
        i +
        (person.gender === Gender.Male
          ? 0
          : this._data.noOfDates % 2 === 0
          ? 1
          : 0);
      const newIndex =
        position < 0
          ? position + queueLength
          : position >= queueLength
          ? position - queueLength
          : position;
      meetsWith.push(otherQueue[newIndex]);
    }
    return meetsWith;
  }

  private showAgeRangeOfDates() {
    this.participants.value.forEach((person) => {
      const myDates = this.findMyDates(person);
      let lowestAge = 100;
      let highestAge = 0;
      myDates
        .filter((date) => date !== SeatingService.missingPerson)
        .forEach((date) => {
          lowestAge = Math.min(date.age, lowestAge);
          highestAge = Math.max(date.age, highestAge);
        });
      person.meetsAgeRange = `${lowestAge} ... ${highestAge}`;
    });
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

    this._data.dates.forEach((date, index) => {
      const man = currentSeatingOfMen[index];
      if (man === SeatingService.missingPerson) {
        delete date.man;
      } else {
        date.man = currentSeatingOfMen[index];
      }
    });
    this._data.dateNumber = this.position - this.startPosition + 1;
    this.data.next(this._data);
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
