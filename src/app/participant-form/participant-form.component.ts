import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Participant } from '../participants/participants.component';

@Component({
  selector: 'app-participant-form',
  templateUrl: './participant-form.component.html',
  styleUrls: ['./participant-form.component.css']
})
export class ParticipantFormComponent {
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ParticipantFormComponent>,
    @Inject(MAT_DIALOG_DATA) public participant: Participant
  ) {}

  form = this.fb.group({
    firstName: [this.participant?.firstName || '', [Validators.required]],
    lastName: [this.participant?.lastName || '', [Validators.required]],
    age: [
      this.participant?.age || '',
      [Validators.required, Validators.min(18), Validators.max(80)]
    ],
    gender: [this.participant?.gender || '', [Validators.required]]
  });

  onSubmit() {
    const person: Participant = {
      firstName: this.form.value['firstName'],
      lastName: this.form.value['lastName'],
      age: Number(this.form.value['age']),
      gender: this.form.value['gender']
    };
    this.dialogRef.close(person);
  }

  cancel() {
    this.dialogRef.close();
  }
}
