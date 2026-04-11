import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { TeachingServiceCommitteeCell } from '../teaching-service-committees.service';

@Component({
  selector: 'app-committee-cell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './committee-cell.component.html',
})
export class CommitteeCellComponent {
  @Input({ required: true }) cell!: TeachingServiceCommitteeCell;
  @Input() isEditing = false;
  @Input() canEdit = false;
  @Input() isBusy = false;
  @Input() datetimeValue = '';
  @Input() selectedFileName = '';

  @Output() datetimeChange = new EventEmitter<string>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() downloadRequested = new EventEmitter<TeachingServiceCommitteeCell>();

  onDateTimeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.datetimeChange.emit(target.value);
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;
    target.value = '';
    if (!file) {
      return;
    }

    this.fileSelected.emit(file);
  }

  downloadFile() {
    this.downloadRequested.emit(this.cell);
  }

  formatDateTime() {
    if (!this.cell.date && !this.cell.time) {
      return 'Sin información';
    }

    if (!this.cell.date) {
      return this.cell.time || 'Sin información';
    }

    const date = new Date(this.cell.date);
    const formattedDate = Number.isNaN(date.getTime())
      ? this.cell.date.slice(0, 10)
      : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);

    return this.cell.time ? `${formattedDate} - ${this.cell.time}` : formattedDate;
  }
}