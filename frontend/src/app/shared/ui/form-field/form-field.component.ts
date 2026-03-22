import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-field.component.html'})
export class FormFieldComponent {
  label = input<string>('');
  required = input<boolean>(false);
  hint = input<string>('');
  error = input<string | null>(null);
  forId = input<string>('');
}

