import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  constructor(
    private domSanitizer: DomSanitizer,
    private matIconRegistry: MatIconRegistry
  ) {
    this.matIconRegistry
      .addSvgIcon(
        'Male',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/male.svg')
      )
      .addSvgIcon(
        'Female',
        this.domSanitizer.bypassSecurityTrustResourceUrl('../assets/female.svg')
      );
  }
}
