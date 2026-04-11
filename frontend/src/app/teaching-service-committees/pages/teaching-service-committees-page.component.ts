import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../shared/notification/notification.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { CommitteeCellComponent } from '../components/committee-cell.component';
import {
  TeachingServiceCommitteeCell,
  TeachingServiceCommitteeMatrix,
  TeachingServiceCommitteeRow,
  TeachingServiceCommitteesService,
} from '../teaching-service-committees.service';
import { forkJoin, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-teaching-service-committees-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, CardComponent, CommitteeCellComponent],
  templateUrl: './teaching-service-committees-page.component.html',
})
export class TeachingServiceCommitteesPageComponent implements OnInit {
  private readonly service = inject(TeachingServiceCommitteesService);
  private readonly notifications = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly currentUser = this.authService.currentUser;
  readonly isEditable = computed(() => this.currentUser()?.role === 'HOSPITAL');

  readonly loading = signal(true);
  readonly matrix = signal<TeachingServiceCommitteeMatrix | null>(null);
  readonly editingRowId = signal<string | null>(null);
  readonly savingRowId = signal<string | null>(null);

  selectedYear = new Date().getFullYear();
  readonly committeeNumbers = [1, 2, 3, 4];
  private readonly rowForms = new Map<string, FormGroup>();
  private readonly rowSelectedFiles = new Map<string, Map<number, File>>();

  ngOnInit() {
    this.loadMatrix();
  }

  loadMatrix() {
    this.loading.set(true);
    this.service.getMatrix(this.selectedYear).subscribe({
      next: (matrix) => {
        this.matrix.set(matrix);
        this.rebuildRowForms(matrix);
        this.editingRowId.set(null);
        this.savingRowId.set(null);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.notifications.error(error?.error?.message || 'No fue posible cargar la matriz de comités.');
      },
    });
  }

  onYearChange(yearRaw: string | number) {
    const year = Number(yearRaw);
    if (!Number.isInteger(year)) {
      return;
    }

    this.selectedYear = year;
    this.loadMatrix();
  }

  startEditing(row: TeachingServiceCommitteeRow) {
    if (!this.isEditable()) {
      return;
    }

    this.editingRowId.set(row.institutionId);
    this.rowSelectedFiles.set(row.institutionId, new Map());
    this.syncRowForm(row);
  }

  saveRow(row: TeachingServiceCommitteeRow) {
    const form = this.rowForms.get(row.institutionId);
    if (!form) {
      return;
    }

    this.savingRowId.set(row.institutionId);

    const updateRequests = row.committees.map((cell) => {
      const datetimeValue = this.getDateTimeControlValue(row.institutionId, cell.committeeNumber);
      const payload = this.toUpdatePayload(datetimeValue, cell);
      return this.service.updateCommittee(cell, payload);
    });

    forkJoin(updateRequests)
      .pipe(
        switchMap((updatedCells) => {
          this.patchRow(row.institutionId, updatedCells);
          this.editingRowId.set(null);

          const files = this.rowSelectedFiles.get(row.institutionId);
          const uploadRequests = updatedCells
            .map((updatedCell) => {
              const selectedFile = files?.get(updatedCell.committeeNumber);
              return selectedFile ? this.service.uploadFile(updatedCell, selectedFile) : null;
            })
            .filter((request): request is ReturnType<TeachingServiceCommitteesService['uploadFile']> => !!request);

          return uploadRequests.length ? forkJoin(uploadRequests) : of([] as TeachingServiceCommitteeCell[]);
        }),
      )
      .subscribe({
        next: (uploadedCells) => {
          if (uploadedCells.length) {
            this.patchRow(row.institutionId, uploadedCells);
          }

          this.rowSelectedFiles.set(row.institutionId, new Map());
          this.savingRowId.set(null);
          this.notifications.success('Fila de comités guardada correctamente.');
        },
        error: (error) => {
          this.editingRowId.set(row.institutionId);
          this.savingRowId.set(null);
          this.notifications.error(error?.error?.message || 'No fue posible guardar la fila de comités.');
        },
      });
  }

  isEditingRow(row: TeachingServiceCommitteeRow) {
    return this.editingRowId() === row.institutionId;
  }

  isSavingRow(row: TeachingServiceCommitteeRow) {
    return this.savingRowId() === row.institutionId;
  }

  onDateTimeChange(row: TeachingServiceCommitteeRow, committeeNumber: number, value: string) {
    const form = this.rowForms.get(row.institutionId);
    form?.get(this.controlName(committeeNumber))?.setValue(value);
  }

  onFileSelected(row: TeachingServiceCommitteeRow, committeeNumber: number, file: File) {
    const rowFiles = this.rowSelectedFiles.get(row.institutionId) ?? new Map<number, File>();
    rowFiles.set(committeeNumber, file);
    this.rowSelectedFiles.set(row.institutionId, rowFiles);
  }

  getSelectedFileName(row: TeachingServiceCommitteeRow, committeeNumber: number) {
    return this.rowSelectedFiles.get(row.institutionId)?.get(committeeNumber)?.name || '';
  }

  getDateTimeValue(row: TeachingServiceCommitteeRow, committeeNumber: number) {
    return this.getDateTimeControlValue(row.institutionId, committeeNumber);
  }

  downloadFile(cell: TeachingServiceCommitteeCell) {
    if (!cell.fileUrl) {
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = `http://localhost:3000${cell.fileUrl}`;
    anchor.download = cell.originalFileName || `comite-${cell.committeeNumber}`;
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  private rebuildRowForms(matrix: TeachingServiceCommitteeMatrix) {
    this.rowForms.clear();
    this.rowSelectedFiles.clear();

    for (const row of matrix.institutions) {
      this.rowForms.set(row.institutionId, this.buildRowForm(row));
      this.rowSelectedFiles.set(row.institutionId, new Map());
    }
  }

  private buildRowForm(row: TeachingServiceCommitteeRow) {
    return this.fb.group(
      row.committees.reduce<Record<string, string>>((controls, cell) => {
        controls[this.controlName(cell.committeeNumber)] = this.toDateTimeLocal(cell);
        return controls;
      }, {}),
    );
  }

  private syncRowForm(row: TeachingServiceCommitteeRow) {
    const form = this.rowForms.get(row.institutionId);
    if (!form) {
      return;
    }

    form.patchValue(
      row.committees.reduce<Record<string, string>>((controls, cell) => {
        controls[this.controlName(cell.committeeNumber)] = this.toDateTimeLocal(cell);
        return controls;
      }, {}),
      { emitEvent: false },
    );
  }

  private toDateTimeLocal(cell: TeachingServiceCommitteeCell) {
    if (!cell.date) {
      return '';
    }

    const datePart = cell.date.slice(0, 10);
    const timePart = cell.time || '00:00';
    return `${datePart}T${timePart}`;
  }

  private getDateTimeControlValue(institutionId: string, committeeNumber: number) {
    return (this.rowForms.get(institutionId)?.get(this.controlName(committeeNumber))?.value as string) || '';
  }

  private controlName(committeeNumber: number) {
    return `committee_${committeeNumber}`;
  }

  private toUpdatePayload(datetimeValue: string, cell: TeachingServiceCommitteeCell) {
    if (!datetimeValue) {
      return {
        date: null,
        time: null,
        extraField: cell.extraField,
      };
    }

    const [datePart, timePart] = datetimeValue.split('T');
    return {
      date: datePart ? `${datePart}T00:00:00.000Z` : null,
      time: timePart || null,
      extraField: cell.extraField,
    };
  }

  private patchRow(institutionId: string, updatedCells: TeachingServiceCommitteeCell[]) {
    const current = this.matrix();
    if (!current) {
      return;
    }

    const updatedMap = new Map(updatedCells.map((cell) => [cell.committeeNumber, cell]));

    this.matrix.set({
      ...current,
      institutions: current.institutions.map((row) => {
        if (row.institutionId !== institutionId) {
          return row;
        }

        const nextRow = {
          ...row,
          committees: row.committees.map((committee) => updatedMap.get(committee.committeeNumber) ?? committee),
        };
        this.syncRowForm(nextRow);

        return {
          ...nextRow,
        };
      }),
    });
  }
}