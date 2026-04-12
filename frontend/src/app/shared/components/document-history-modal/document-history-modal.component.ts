import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from '../../ui/modal/modal.component';
import type { DocumentVersionSummary } from '../../services/documents.service';

@Component({
  selector: 'app-document-history-modal',
  standalone: true,
  imports: [CommonModule, ModalComponent],
  templateUrl: './document-history-modal.component.html',
})
export class DocumentHistoryModalComponent {
  @Input() isOpen = false;
  @Input() title = 'Historial documental';
  @Input() loading = false;
  @Input() versions: DocumentVersionSummary[] | null = null;

  @Output() closeEvent = new EventEmitter<void>();

  close() {
    this.closeEvent.emit();
  }
}