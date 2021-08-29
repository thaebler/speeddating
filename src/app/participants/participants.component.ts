import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
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
    'age',
    'gender'
  ];
  dataSource = new MatTableDataSource<Participant>([]);
  selection = new SelectionModel<Participant>(false, []);

  @ViewChild(MatSort)
  sort!: MatSort;

  constructor(public dialog: MatDialog, public seatingService: SeatingService) {
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

  private onDataChange() {
    this.seatingService.participants.next(this.dataSource.data);
  }

  add() {
    const dialogRef = this.dialog.open(ParticipantFormComponent, {
      data: { title: 'New Person' }
    });

    dialogRef.afterClosed().subscribe((newPerson) => {
      if (newPerson) {
        this.dataSource.data = [...this.dataSource.data, newPerson];
        this.onDataChange();
      }
    });
  }

  edit() {
    const selection = this.selection.selected[0];
    const dialogRef = this.dialog.open(ParticipantFormComponent, {
      data: { participant: selection, title: 'Edit Person' }
    });

    dialogRef.afterClosed().subscribe((modifiedPerson) => {
      if (modifiedPerson) {
        const index = this.dataSource.data.indexOf(selection);
        this.dataSource.data[index] = modifiedPerson;
        this.dataSource.data = [...this.dataSource.data];
        this.selection.clear();
        this.selection.select(modifiedPerson);
        this.onDataChange();
      }
    });
  }

  async paste() {
    const clipboard = await navigator.clipboard.readText();
    this.pasteData(clipboard);
    this.onDataChange();
  }

  private pasteData(data: string) {
    const rows = data.split('\n');
    const participants: Participant[] = [];
    rows.forEach((row) => {
      const cells = row.split('\t');
      if (cells.length !== 4) {
        throw new Error(`Wrong format`);
      }
      participants.push({
        firstName: cells[0].trim(),
        lastName: cells[1].trim(),
        age: Number(cells[2].trim()),
        gender: readGender(cells[3].trim())
      });
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
      text.push(
        `${participant.firstName}\t${participant.lastName}\t${participant.age}\t${participant.gender}`
      );
    });
    return text.join('\n');
  }

  remove() {
    this.dataSource.data = this.dataSource.data.filter((participant) => {
      return !this.selection.isSelected(participant);
    });
    this.selection.clear();
    this.onDataChange();
  }

  removeAll() {
    const message = `This will remove all participants. Are you sure you want to do this?`;

    const dialogData = new ConfirmDialogModel('Confirm Action', message);

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
}
