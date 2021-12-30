import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { TranslateService } from '@ngx-translate/core';
import { ClipboardDialogComponent } from '../clipboard-dialog/clipboard-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogModel
} from '../confirm-dialog/confirm-dialog.component';
import { ParticipantFormComponent } from '../participant-form/participant-form.component';
import { Gender, Participant, SeatingService } from '../seating.service';

@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css']
})
export class ParticipantsComponent implements AfterViewInit {
  displayedColumns: string[] = [
    'select',
    'firstName',
    'lastName',
    'nickName',
    'age',
    'startsAtTable',
    'meetsAgeRange'
  ];
  dataSource = new MatTableDataSource<Participant>([]);
  selection = new SelectionModel<Participant>(false, []);

  @ViewChild(MatSort)
  sort!: MatSort;

  constructor(
    public dialog: MatDialog,
    public seatingService: SeatingService,
    private translate: TranslateService
  ) {
    window.onbeforeunload = (e) => {
      localStorage.setItem('data', this.copy());
    };
    const data = localStorage.getItem('data');
    if (data && typeof data === 'string') {
      this.pasteData(data);
    }
    this.onDataChange();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (
      data: any,
      sortHeaderId: string
    ): string => {
      if (typeof data[sortHeaderId] === 'string') {
        return data[sortHeaderId].toLocaleLowerCase();
      }
      return data[sortHeaderId];
    };
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  hasSelection(): boolean {
    return this.selection.selected.length > 0;
  }

  hasSingleSelection(): boolean {
    return this.selection.selected.length === 1;
  }

  isEmpty(): boolean {
    return this.dataSource.data.length === 0;
  }

  genderColor(person: Participant): string {
    if (person.gender === Gender.Male) {
      return 'primary';
    }
    return 'accent';
  }

  startsAtTable(person: Participant): string {
    if (person.startsWithBreak) {
      if (person.gender === Gender.Female) {
        return `${person.startsAtTable} (${this.translate.instant(
          'startsWithBreak'
        )})`;
      } else {
        return `${this.translate.instant('startsWithBreakThenTable')} ${
          person.startsAtTable
        }`;
      }
    }
    return `${person.startsAtTable}`;
  }

  private onDataChange() {
    this.seatingService.participants.next(this.dataSource.data);
  }

  add() {
    const dialogRef = this.dialog.open(ParticipantFormComponent, {
      data: { title: this.translate.instant('addNewPersonTitle') }
    });

    dialogRef.afterClosed().subscribe((newPerson: Participant) => {
      if (newPerson) {
        this.dataSource.data = [...this.dataSource.data, newPerson];
        if (newPerson.nogos.length) {
          this.seatingService.updateNogoRuleFor(newPerson, [], newPerson.nogos);
        }
        this.onDataChange();
      }
    });
  }

  edit() {
    const selection = this.selection.selected[0];
    const dialogRef = this.dialog.open(ParticipantFormComponent, {
      data: {
        participant: selection,
        title: this.translate.instant('editPersonTitle')
      }
    });
    const oldNogoList = [...selection.nogos];

    dialogRef.afterClosed().subscribe((modifiedPerson: Participant) => {
      if (modifiedPerson) {
        const index = this.dataSource.data.indexOf(selection);
        this.dataSource.data[index] = modifiedPerson;
        this.dataSource.data = [...this.dataSource.data];
        this.selection.clear();
        this.selection.select(modifiedPerson);
        this.seatingService.updateNogoRuleFor(
          modifiedPerson,
          oldNogoList,
          modifiedPerson.nogos
        );
        this.onDataChange();
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  private async readFromClipboard(): Promise<string> {
    if (navigator.clipboard && navigator.clipboard['readText']) {
      return navigator.clipboard.readText();
    }
    const dialogRef = this.dialog.open(ClipboardDialogComponent, {});
    return dialogRef.afterClosed().toPromise();
  }

  async paste() {
    const clipboard = await this.readFromClipboard();
    this.pasteData(clipboard);
    this.onDataChange();
  }

  private pasteData(data: string) {
    const rows = data
      .split('\n')
      .map((untrimmed) => untrimmed.trim())
      .filter((row) => row.length > 0);
    const participants: Participant[] = [];
    const nogoRules: Record<string, string[]> = {};
    rows.forEach((row) => {
      const cells = row.split(/;|\t/);
      if (cells.length < 5) {
        throw new Error(`Wrong format`);
      }
      const firstName = cells[0].trim();
      const lastName = cells[1].trim();
      const nickName = cells[2].trim();
      const age = cells[3].trim();
      const gender = cells[4].trim();
      const nogoRule = cells[5]?.trim();
      if (!firstName && !lastName && !nickName && !age && !gender) {
        // skip this line
        return;
      }
      // check that the nicknames are unique:
      if (
        !nickName ||
        participants.findIndex((person) => person.nickName === nickName) >= 0
      ) {
        throw new Error(`Nicknames must be unique (Nickname: ${nickName})`);
      }
      participants.push({
        firstName,
        lastName,
        nickName,
        age: Number(age),
        gender: readGender(gender),
        startsAtTable: 0,
        nogos: [],
        meetsAgeRange: ''
      });
      if (nogoRule) {
        const nogoList = nogoRule.split(',').map((name) => name.trim());
        nogoRules[nickName] = nogoList;
      }
    });
    Object.keys(nogoRules).forEach((nickName) => {
      this.seatingService.addNogoRuleFor(
        nickName,
        nogoRules[nickName],
        participants
      );
    });
    this.dataSource.data = participants;

    function readGender(gender: string): Gender {
      if (Gender.Female.toUpperCase() === gender?.toUpperCase()) {
        return Gender.Female;
      }
      if (Gender.Male.toUpperCase() === gender?.toUpperCase()) {
        return Gender.Male;
      }
      throw new Error(
        `Could not read gender. Make sure it's 'Male' or 'Female'`
      );
    }
  }

  copy(): string {
    const text: string[] = [];
    this.dataSource.data.forEach((participant) => {
      const nogosString = participant.nogos
        .map((person) => person.nickName)
        .join(',');
      text.push(
        `${participant.firstName}\t${participant.lastName}\t${participant.nickName}\t${participant.age}\t${participant.gender}\t${nogosString}`
      );
    });
    return text.join('\n');
  }

  remove() {
    const selected = this.dataSource.data.find((participant) => {
      return this.selection.isSelected(participant);
    });
    if (selected) {
      this.dataSource.data = this.dataSource.data.filter((participant) => {
        return participant !== selected;
      });
      this.seatingService.updateNogoRuleFor(selected, selected?.nogos, []);
      this.selection.clear();
      this.onDataChange();
    }
  }

  removeAll() {
    const message = this.translate.instant('removeAllParticipantsWarning');
    const dialogData = new ConfirmDialogModel(
      this.translate.instant('confirmActionTitle'),
      message
    );
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: '400px',
      data: dialogData
    });
    dialogRef.afterClosed().subscribe((dialogResult) => {
      if (dialogResult) {
        this.dataSource.data = [];
        this.selection.clear();
        this.onDataChange();
      }
    });
  }

  exportStartNumbers(): string {
    const text: string[] = [
      `${this.translate.instant('firstName')}\t${this.translate.instant(
        'lastName'
      )}\t${this.translate.instant('nickName')}\t${this.translate.instant(
        'age'
      )}\t${this.translate.instant('gender')}\t${this.translate.instant(
        'startsAtTable'
      )}`
    ];
    this.dataSource.data.forEach((participant) => {
      text.push(
        `${participant.firstName}\t${participant.lastName}\t${
          participant.nickName
        }\t${participant.age}\t${participant.gender}\t${this.startsAtTable(
          participant
        )}`
      );
    });
    return text.join('\n');
  }
}
