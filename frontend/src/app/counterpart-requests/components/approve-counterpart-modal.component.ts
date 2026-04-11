import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { InputComponent } from '../../shared/ui/input/input.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

@Component({
  selector: 'app-approve-counterpart-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, ButtonComponent, FormFieldComponent, InputComponent],
  templateUrl: './approve-counterpart-modal.component.html',
})
export class ApproveCounterpartModalComponent {
  private readonly fb = inject(FormBuilder);

  @Input() isOpen = false;
  @Input() isSubmitting = false;
  @Input() requestName = '';

  @Output() closeEvent = new EventEmitter<void>();
  @Output() approveEvent = new EventEmitter<{ valueWithoutDiscount: number; discountPercentage: number; valueWithDiscount: number }>();

  readonly form = this.fb.group({
    valueWithoutDiscount: ['', [Validators.required]],
    discountPercentage: ['', [Validators.required]],
    valueWithDiscount: ['', [Validators.required]],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.approveEvent.emit({
      valueWithoutDiscount: Number(raw.valueWithoutDiscount),
      discountPercentage: Number(raw.discountPercentage),
      valueWithDiscount: Number(raw.valueWithDiscount),
    });
  }

  close() {
    this.form.reset({ valueWithoutDiscount: '', discountPercentage: '', valueWithDiscount: '' });
    this.closeEvent.emit();
  }
}