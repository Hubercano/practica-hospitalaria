// src/app/shared/ui/badge/badge.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
})
export class BadgeComponent {
  @Input() variant: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' = 'neutral';
  @Input() size: 'sm' | 'md' = 'sm';

  getClasses(): string {
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
    };

    const variantClasses = {
      primary: 'bg-blue-100 text-blue-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      danger: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800',
    };

    return `${sizeClasses[this.size]} ${variantClasses[this.variant]}`;
  }
}
