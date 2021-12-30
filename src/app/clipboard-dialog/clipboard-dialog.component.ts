import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-clipboard-dialog',
  templateUrl: './clipboard-dialog.component.html',
  styleUrls: ['./clipboard-dialog.component.css']
})
export class ClipboardDialogComponent {
  clipboard = '';

  constructor(public dialogRef: MatDialogRef<ClipboardDialogComponent>) {}

  onConfirm(): void {
    this.dialogRef.close(this.clipboard);
  }

  onDismiss(): void {
    this.dialogRef.close('');
  }
}
