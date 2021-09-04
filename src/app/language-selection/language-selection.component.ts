import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-language-selection',
  templateUrl: './language-selection.component.html',
  styleUrls: ['./language-selection.component.css']
})
export class LanguageSelectionComponent {
  languages = [
    {
      id: 'en',
      name: 'English'
    },
    {
      id: 'de',
      name: 'Deutsch'
    }
  ];
  selectedLanguage: string;

  constructor(private translate: TranslateService) {
    this.selectedLanguage = localStorage.getItem('languageId') || 'de';
    translate.addLangs(['en', 'de']);
    translate.use(this.selectedLanguage);
  }

  setLanguage(languageId: string) {
    localStorage.setItem('languageId', languageId);
    this.translate.use(languageId);
  }
}
