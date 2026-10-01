import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RotationSchedulesService, RotationShiftBoardAssignment, RotationShiftDefinition } from '../../../core/services/rotation-schedules.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

interface MatrixStudentRow {
  id: string;
  name: string;
  totalHours: number;
}

@Component({
  selector: 'app-rotation-schedule-matrix',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonComponent],
  templateUrl: './rotation-schedule-matrix.component.html',
})
export class RotationScheduleMatrixComponent implements OnInit {
  schedule = signal<any>(null);
  loading = signal(true);
  saving = signal(false);
  dates = signal<string[]>([]);
  rows = signal<MatrixStudentRow[]>([]);
  shiftDefinitions = signal<RotationShiftDefinition[]>([]);
  scheduleId = '';

  private allStudents: any[] = [];
  private cellValues: Record<string, string> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: RotationSchedulesService,
    private ns: NotificationService,
  ) {}

  ngOnInit() {
    this.scheduleId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.scheduleId) {
      this.router.navigate(['/rotation-schedules']);
      return;
    }

    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getStudents().subscribe({
      next: (students) => {
        this.allStudents = Array.isArray(students) ? students : [];
        this.loadSchedule();
      },
      error: () => {
        this.allStudents = [];
        this.loadSchedule();
      },
    });
  }

  private loadSchedule() {
    this.svc.getOne(this.scheduleId).subscribe({
      next: (schedule: any) => {
        this.schedule.set(schedule);
        this.buildMatrix(schedule);
        this.loading.set(false);
      },
      error: (err: any) => {
        this.ns.error(err?.error?.message || 'No se pudo cargar el cuadro de turnos');
        this.loading.set(false);
      },
    });
  }

  private buildMatrix(schedule: any) {
    const definitions = Array.isArray(schedule.shiftDefinitions) ? schedule.shiftDefinitions : [];
    this.shiftDefinitions.set(definitions);
    this.dates.set(this.buildDateRange(schedule.startDate, schedule.endDate));

    const studentIds = Array.isArray(schedule.studentIds) ? schedule.studentIds : [];
    const rows = studentIds
      .map((studentId: string) => {
        const found = this.allStudents.find((item: any) => item.id === studentId || item._id === studentId);
        const name = found ? `${found.firstName || ''} ${found.lastName || ''}`.trim() : studentId;
        return { id: studentId, name, totalHours: 0 };
      })
      .sort((a: MatrixStudentRow, b: MatrixStudentRow) => a.name.localeCompare(b.name));

    this.rows.set(rows);
    this.cellValues = {};

    const assignments = Array.isArray(schedule.shiftAssignments) ? schedule.shiftAssignments : [];
    assignments.forEach((assignment: any) => {
      this.cellValues[this.cellKey(assignment.studentId, this.toDateOnly(assignment.assignmentDate))] = assignment.shiftDefinitionId;
    });

    this.recalculateTotals();
  }

  private buildDateRange(startDate: string, endDate: string): string[] {
    const values: string[] = [];
    const start = new Date(`${this.toDateOnly(startDate)}T00:00:00`);
    const end = new Date(`${this.toDateOnly(endDate)}T00:00:00`);

    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      values.push(this.toDateOnly(cursor.toISOString()));
    }

    return values;
  }

  private toDateOnly(value: string): string {
    return value ? value.slice(0, 10) : '';
  }

  private cellKey(studentId: string, date: string): string {
    return `${studentId}::${date}`;
  }

  getCellValue(studentId: string, date: string): string {
    return this.cellValues[this.cellKey(studentId, date)] || '';
  }

  setCellValue(studentId: string, date: string, shiftDefinitionId: string) {
    const key = this.cellKey(studentId, date);
    if (shiftDefinitionId) {
      this.cellValues[key] = shiftDefinitionId;
    } else {
      delete this.cellValues[key];
    }
    this.recalculateTotals();
  }

  private recalculateTotals() {
    const definitionMap = new Map(this.shiftDefinitions().map((definition) => [definition.id, definition]));
    this.rows.set(
      this.rows().map((row) => {
        let totalMinutes = 0;
        this.dates().forEach((date) => {
          const definition = definitionMap.get(this.getCellValue(row.id, date));
          if (definition) {
            totalMinutes += this.getShiftMinutes(definition.startTime, definition.endTime);
          }
        });
        return { ...row, totalHours: Math.round((totalMinutes / 60) * 10) / 10 };
      }),
    );
  }

  private getShiftMinutes(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const diff = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    return diff > 0 ? diff : 0;
  }

  save() {
    const assignments: RotationShiftBoardAssignment[] = [];
    this.rows().forEach((row) => {
      this.dates().forEach((date) => {
        const shiftDefinitionId = this.getCellValue(row.id, date);
        if (shiftDefinitionId) {
          assignments.push({ assignmentDate: date, studentId: row.id, shiftDefinitionId });
        }
      });
    });

    this.saving.set(true);
    this.svc.updateShiftBoard(this.scheduleId, { assignments }).subscribe({
      next: (schedule) => {
        this.schedule.set(schedule);
        this.buildMatrix(schedule);
        this.saving.set(false);
        this.ns.success('Cuadro de turnos actualizado correctamente');
      },
      error: (err) => {
        this.saving.set(false);
        this.ns.error(err?.error?.message || 'No se pudo guardar el cuadro de turnos');
      },
    });
  }

  formatMonthYear(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  }

  formatDay(date: string): string {
    return new Date(`${date}T00:00:00`).getDate().toString();
  }

  formatDayName(date: string): string {
    return ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][new Date(`${date}T00:00:00`).getDay()];
  }

  isWeekend(date: string): boolean {
    const day = new Date(`${date}T00:00:00`).getDay();
    return day === 0 || day === 6;
  }

  get monthGroups(): { label: string; span: number }[] {
    const groups: { label: string; span: number }[] = [];
    this.dates().forEach((date) => {
      const label = this.formatMonthYear(date);
      if (groups.length && groups[groups.length - 1].label === label) {
        groups[groups.length - 1].span += 1;
      } else {
        groups.push({ label, span: 1 });
      }
    });
    return groups;
  }

  goToEdit() {
    this.router.navigate(['/rotation-schedules', this.scheduleId, 'edit']);
  }

  goToList() {
    this.router.navigate(['/rotation-schedules']);
  }
}