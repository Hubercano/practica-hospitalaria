import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FilterChip {
  id: string;
  controlName: string;
  label: string;
  value: any;
  fieldLabel: string;
}

@Component({
  selector: 'app-filter-chips',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (chips.length > 0) {
      <div class="flex flex-wrap gap-2 py-2">
        @for (chip of chips; track chip.id) {
          <span class="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 select-none">
            <span class="text-indigo-400 font-normal">{{ chip.fieldLabel }}:</span>
            <span>{{ chip.label }}</span>
            <button
              type="button"
              (click)="onRemove(chip)"
              class="flex-shrink-0 ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-indigo-200 transition-colors"
              [attr.aria-label]="'Quitar ' + chip.label"
            >
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </span>
        }
      </div>
    }
  `
})
export class FilterChipsComponent {
  @Input() chips: FilterChip[] = [];
  @Output() removeChip = new EventEmitter<FilterChip>();

  onRemove(chip: FilterChip): void {
    this.removeChip.emit(chip);
  }
}
