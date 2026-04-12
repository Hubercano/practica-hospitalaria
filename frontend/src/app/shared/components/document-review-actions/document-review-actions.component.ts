import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-document-review-actions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-review-actions.component.html',
})
export class DocumentReviewActionsComponent {
  @Input() showDownload = false;
  @Input() showHistory = false;
  @Input() showApprove = false;
  @Input() showReject = false;
  @Input() disableApprove = false;
  @Input() disableReject = false;

  @Output() download = new EventEmitter<void>();
  @Output() history = new EventEmitter<void>();
  @Output() approve = new EventEmitter<void>();
  @Output() reject = new EventEmitter<void>();
}