import { Component, OnInit } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { PickerModule } from '@ctrl/ngx-emoji-mart';

// Standalone + import() diferido en el llamador: emoji-mart pesa cientos de KB
// y antes viajaba en el bundle inicial de todos los visitantes (Googlebot incluido).
@Component({
  standalone: true,
  imports: [PickerModule],
  selector: 'app-bottom-sheets-emojis',
  templateUrl: './bottom-sheets-emojis.component.html',
  styleUrls: ['./bottom-sheets-emojis.component.scss'],
})
export class BottomSheetsEmojisComponent implements OnInit {
  constructor(
    private ref: MatBottomSheetRef<BottomSheetsEmojisComponent>
  ) {}

  ngOnInit(): void {}

  addEmoji(emoji: any): void {
    this.ref.dismiss(emoji);
  }
}
