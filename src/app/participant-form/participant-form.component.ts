import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { Component, Inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Participant, SeatingService } from '../seating.service';

@Component({
  selector: 'app-participant-form',
  templateUrl: './participant-form.component.html',
  styleUrls: ['./participant-form.component.css']
})
export class ParticipantFormComponent {
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;

  nogos: Participant[];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ParticipantFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ParticipantFormModel,
    private seatingService: SeatingService
  ) {
    this.nogos = this.data.participant?.nogos || [];
  }

  form = this.fb.group({
    firstName: [this.data.participant?.firstName || '', [Validators.required]],
    lastName: [this.data.participant?.lastName || '', [Validators.required]],
    nickName: [
      this.data.participant?.nickName || '',
      [
        Validators.required,
        uniqueNicknameValidator(this.seatingService, this.data.participant)
      ]
    ],
    age: [
      this.data.participant?.age || '',
      [Validators.required, Validators.min(18), Validators.max(80)]
    ],
    gender: [this.data.participant?.gender || '', [Validators.required]]
  });

  onSubmit() {
    const person: Participant = {
      firstName: this.form.value['firstName'],
      lastName: this.form.value['lastName'],
      nickName: this.form.value['nickName'],
      age: Number(this.form.value['age']),
      gender: this.form.value['gender'],
      startsAtTable: 0,
      nogos: this.nogos,
      meetsAgeRange: ''
    };
    if (this.data.participant) {
      Object.assign(this.data.participant, person);
      this.dialogRef.close(this.data.participant);
    } else {
      this.dialogRef.close(person);
    }
  }

  cancel() {
    this.dialogRef.close();
  }

  addNogo(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      const person = this.seatingService.participants.value.find(
        (person) => person.nickName.toLowerCase() === value.toLowerCase()
      );
      if (person) {
        this.nogos.push(person);
      }
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  removeNogo(person: Participant): void {
    const index = this.nogos.indexOf(person);

    if (index >= 0) {
      this.nogos.splice(index, 1);
    }
  }
}

export class ParticipantFormModel {
  constructor(public title: string, public participant: Participant) {}
}

function uniqueNicknameValidator(
  seatingService: SeatingService,
  myself: Participant
): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const foundIndex = seatingService.participants.value.findIndex(
      (person) =>
        person.nickName.toLowerCase() === control.value.toLowerCase() &&
        person !== myself
    );
    return foundIndex >= 0
      ? { uniqueNickname: { value: control.value } }
      : null;
  };
}
