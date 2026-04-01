import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { FilterChip, FilterChipsComponent } from '../../../shared/ui/filter-chips/filter-chips.component';
import { InductionValidityCode, InductionsService } from '../../../core/services/inductions.service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { RotationGroupStudent, RotationMonthGroup, RotationSchedulesService } from '../../../core/services/rotation-schedules.service';
import { addMonthsToDateOnly, toDateOnly } from '../../../shared/utils/date.util';

type RotationOption = {
  id: string;
  label: string;
  name: string;
  startDate: string;
  studentCount: number;
  students: RotationGroupStudent[];
};

type ConsolidatedStudent = {
  id: string;
  name: string;
  document: string;
};

@Component({
  selector: 'app-induction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgSelectModule, ButtonComponent, FilterChipsComponent],
  templateUrl: './induction-form.component.html',
})
export class InductionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(InductionsService);
  private rotationSchedulesService = inject(RotationSchedulesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ns = inject(NotificationService);

  isEditMode = false;
  inductionId: string | null = null;
  loadingForm = false;
  rotationOptions: RotationOption[] = [];
  loadingRotations = false;
  hasInductionDate = false;
  private pendingStudentIdsToRestore: string[] = [];
  private originalInductionDate = '';
  private legacyStudentsForEdit: ConsolidatedStudent[] = [];

  readonly validityOptions: Array<{ value: InductionValidityCode; label: string; months: number }> = [
    { value: 'THREE_MONTHS', label: '3 meses', months: 3 },
    { value: 'SIX_MONTHS', label: '6 meses', months: 6 },
    { value: 'ONE_YEAR', label: '1 año', months: 12 },
    { value: 'ONE_YEAR_SIX_MONTHS', label: '1 año y 6 meses', months: 18 },
    { value: 'TWO_YEARS', label: '2 años', months: 24 },
  ];

  form = this.fb.group({
    name: ['', [Validators.required]],
    inductionDate: ['', [Validators.required]],
    validityCode: ['ONE_YEAR' as InductionValidityCode, [Validators.required]],
    rotationIds: [[] as string[]],
  });

  constructor() {
    this.form.controls.inductionDate.valueChanges.subscribe((inductionDate) => {
      const normalizedDate = inductionDate || '';
      if (this.isEditMode && this.originalInductionDate && normalizedDate !== this.originalInductionDate) {
        this.legacyStudentsForEdit = [];
        this.pendingStudentIdsToRestore = [];
      }
      this.loadRotationsByInductionDate(normalizedDate);
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.isEditMode = true;
    this.inductionId = id;
    this.loadInductionForEdit(id);
  }

  get selectedStudentChips(): FilterChip[] {
    const selectedRotationIds = this.form.value.rotationIds || [];
    return selectedRotationIds
      .map((rotationId) => this.rotationOptions.find((option) => option.id === rotationId))
      .filter((option): option is RotationOption => !!option)
      .map((option) => ({
        id: option.id,
        controlName: 'rotationIds',
        label: option.label,
        value: option.id,
        fieldLabel: 'Rotación',
      }));
  }

  get totalSelectedStudents(): number {
    return this.derivedStudents.length;
  }

  get derivedStudents(): ConsolidatedStudent[] {
    const selectedRotationIds = this.form.value.rotationIds || [];
    if (!selectedRotationIds.length) {
      return this.legacyStudentsForEdit;
    }

    const selectedGroups = selectedRotationIds
      .map((rotationId) => this.rotationOptions.find((group) => group.id === rotationId))
      .filter((group): group is RotationOption => !!group);

    const dedup = new Map<string, ConsolidatedStudent>();
    selectedGroups.forEach((group) => {
      (group.students || []).forEach((student) => {
        if (!dedup.has(student.id)) {
          dedup.set(student.id, {
            id: student.id,
            name: student.name,
            document: student.document,
          });
        }
      });
    });

    return Array.from(dedup.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  get calculatedExpiryDate(): string {
    const inductionDate = this.form.value.inductionDate;
    const validityCode = this.form.value.validityCode;

    if (!inductionDate || !validityCode) {
      return '';
    }

    const validity = this.validityOptions.find((option) => option.value === validityCode);
    if (!validity) {
      return '';
    }

    return addMonthsToDateOnly(inductionDate, validity.months);
  }

  removeStudent(chip: FilterChip) {
    const selectedIds = this.form.value.rotationIds || [];
    this.form.patchValue({
      rotationIds: selectedIds.filter((rotationId) => rotationId !== chip.value),
    });
  }

  private formatIsoDate(isoDate: string): string {
    return toDateOnly(isoDate);
  }

  private mapRotationOption(group: RotationMonthGroup): RotationOption {
    const startDate = this.formatIsoDate(group.startDate);
    return {
      id: group.id,
      name: group.name,
      startDate: group.startDate,
      studentCount: group.studentCount,
      students: group.students || [],
      label: `${group.name} (${group.studentCount} estudiantes) · Inicio: ${startDate}`,
    };
  }

  private keepOnlyAvailableSelectedRotations() {
    const allowedIds = new Set(this.rotationOptions.map((option) => option.id));
    const currentSelected = this.form.value.rotationIds || [];
    const filteredSelected = currentSelected.filter((id) => allowedIds.has(id));

    if (filteredSelected.length !== currentSelected.length) {
      this.form.patchValue({ rotationIds: filteredSelected });
    }
  }

  private loadInductionForEdit(id: string) {
    this.loadingForm = true;
    this.service.getOne(id).subscribe({
      next: (induction) => {
        const selectedIds = (induction.students || [])
          .map((row) => row.studentId || row.student?.id || '')
          .filter((value) => !!value);

        this.legacyStudentsForEdit = (induction.students || []).map((row) => ({
          id: row.studentId || row.student?.id || row.id,
          name: row.student ? `${row.student.firstName} ${row.student.lastName}`.trim() : `Documento ${row.document}`,
          document: row.student?.document || row.document,
        }));
        this.pendingStudentIdsToRestore = selectedIds;
        this.originalInductionDate = induction.inductionDate ? induction.inductionDate.slice(0, 10) : '';
        this.form.patchValue({
          name: induction.name,
          inductionDate: induction.inductionDate ? induction.inductionDate.slice(0, 10) : '',
          validityCode: induction.validityCode,
          rotationIds: [],
        });
        this.loadingForm = false;
      },
      error: (err) => {
        this.ns.error(err?.error?.message || 'No fue posible cargar la inducción para edición.');
        this.loadingForm = false;
        this.router.navigate(['/inductions']);
      },
    });
  }

  private loadRotationsByInductionDate(inductionDate: string) {
    const normalizedDate = toDateOnly(inductionDate);
    this.hasInductionDate = !!normalizedDate;
    if (!normalizedDate) {
      this.rotationOptions = [];
      this.form.patchValue({ rotationIds: [] });
      this.pendingStudentIdsToRestore = [];
      if (!this.isEditMode) {
        this.legacyStudentsForEdit = [];
      }
      return;
    }

    const [yearText, monthText] = normalizedDate.split('-');
    const month = Number(monthText);
    const year = Number(yearText);

    this.loadingRotations = true;
    this.rotationSchedulesService.getGroupsByStartMonth(month, year).subscribe({
      next: (groups) => {
        this.rotationOptions = (groups || [])
          .map((group) => this.mapRotationOption(group))
          .sort((a, b) => a.label.localeCompare(b.label));

        if (this.pendingStudentIdsToRestore.length) {
          const pendingSet = new Set(this.pendingStudentIdsToRestore);
          const matchedGroupIds = this.rotationOptions
            .filter((group) => group.students.some((student) => pendingSet.has(student.id)))
            .map((group) => group.id);
          this.form.patchValue({ rotationIds: matchedGroupIds });
          this.pendingStudentIdsToRestore = [];
        } else {
          this.keepOnlyAvailableSelectedRotations();
        }

        this.loadingRotations = false;
      },
      error: (err) => {
        this.ns.error(err?.error?.message || 'No fue posible cargar las rotaciones.');
        this.rotationOptions = [];
        this.form.patchValue({ rotationIds: [] });
        this.pendingStudentIdsToRestore = [];
        this.loadingRotations = false;
      },
    });
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const derivedStudentIds = this.derivedStudents.map((student) => student.id);
    if (!derivedStudentIds.length) {
      this.ns.error('Debes seleccionar al menos una rotación con estudiantes.');
      return;
    }

    const payload = {
      name: value.name!,
      inductionDate: value.inductionDate!,
      validityCode: value.validityCode!,
      studentIds: derivedStudentIds,
    };

    if (this.isEditMode && this.inductionId) {
      this.service.update(this.inductionId, payload).subscribe({
        next: () => {
          this.ns.success('Inducción actualizada correctamente.');
          this.router.navigate(['/inductions', this.inductionId]);
        },
        error: (err) => this.ns.error(err?.error?.message || 'No fue posible actualizar la inducción.'),
      });
      return;
    }

    this.service.create(payload).subscribe({
      next: () => {
        this.ns.success('Inducción creada correctamente.');
        this.router.navigate(['/inductions']);
      },
      error: (err) => this.ns.error(err?.error?.message || 'No fue posible crear la inducción.'),
    });
  }
}
