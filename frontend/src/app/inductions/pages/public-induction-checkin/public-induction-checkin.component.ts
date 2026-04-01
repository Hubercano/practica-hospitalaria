import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { InductionsService } from '../../../core/services/inductions.service';
import { formatDateOnly } from '../../../shared/utils/date.util';

@Component({
  selector: 'app-public-induction-checkin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './public-induction-checkin.component.html',
})
export class PublicInductionCheckinComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(InductionsService);
  private fb = inject(FormBuilder);

  token = '';
  inductionName = '';
  inductionDate = '';
  validityLabel = '';
  expiryDate = '';
  loading = false;
  verifying = false;
  errorMessage = '';
  successMessage = '';

  form = this.fb.group({
    document: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Token de acceso inválido.';
      return;
    }

    this.loading = true;
    this.service.publicGetAccess(this.token).subscribe({
      next: (data) => {
        this.inductionName = data?.name || 'Inducción';
        this.inductionDate = data?.inductionDate || '';
        this.validityLabel = data?.validityLabel || '';
        this.expiryDate = data?.expiryDate || '';
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo validar el acceso.';
        this.loading = false;
      },
    });
  }

  submit() {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.verifying = true;
    this.errorMessage = '';
    this.successMessage = '';

    const document = this.form.value.document || '';

    this.service.publicAttend(this.token, document).subscribe({
      next: (res) => {
        const expiresAt = formatDateOnly(res.expiresAt);
        this.successMessage = `Asistencia registrada. Vence: ${expiresAt || '-'}`;
        this.verifying = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No fue posible registrar la asistencia.';
        this.verifying = false;
      },
    });
  }
}
