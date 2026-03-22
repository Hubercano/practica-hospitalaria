import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'badge' | 'status' | 'actions';
}

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table.component.html'})
export class TableComponent {
  data = input<any[]>([]);
  columns = input<Column[]>([]);

  edit = output<any>();
  delete = output<any>();

  isPending(value: string): boolean {
    return value?.toLowerCase() === 'pendiente';
  }

  getStatusClass(value: string): string {
    const val = value?.toLowerCase() || '';
    if (val === 'activa' || val === 'activo' || val === 'completado') {
      return 'border-emerald-200 text-emerald-600 bg-emerald-50';
    }
    if (val === 'inactiva' || val === 'inactivo' || val === 'cancelado') {
      return 'border-rose-200 text-rose-600 bg-rose-50';
    }
    if (val === 'pendiente') {
      return 'border-amber-400 text-amber-600 bg-amber-50/50';
    }
    return 'border-gray-200 text-gray-600 bg-gray-50';
  }
}
