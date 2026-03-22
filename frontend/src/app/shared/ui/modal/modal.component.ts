// src/app/shared/ui/modal/modal.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showCloseButton = true;
  @Output() closeEvent = new EventEmitter<void>();

  close() {
    this.closeEvent.emit();
  }
}
