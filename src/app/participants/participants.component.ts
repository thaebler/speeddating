import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

export enum Gender {
  Male = 'male',
  Female = 'female'
}
export interface Participant {
  firstname: string;
  lastname: string;
  gender: Gender;
  age: number;
}
export interface Action {
  id: string;
  text: string;
}

@Component({
  selector: 'app-participants',
  templateUrl: './participants.component.html',
  styleUrls: ['./participants.component.css']
})
export class ParticipantsComponent implements OnInit {
  participantList: Participant[] = [];
  displayedColumns: string[] = [
    'select',
    'firstname',
    'lastname',
    'age',
    'gender'
  ];
  dataSource = new MatTableDataSource<Participant>(this.participantList);
  selection = new SelectionModel<Participant>(true, []);
  actions: Action[] = [
    {
      id: 'copy',
      text: 'Copy To Clipboard'
    },
    {
      id: 'paste',
      text: 'Paste From Excel'
    },
    {
      id: 'add',
      text: 'Add...'
    },
    {
      id: 'delete',
      text: 'Delete'
    }
  ];

  constructor() {}

  ngOnInit(): void {}

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

  onAction(action: Action) {
    console.log(action);
  }

  isActionDisabled(action: Action): boolean {
    return false;
  }
}
