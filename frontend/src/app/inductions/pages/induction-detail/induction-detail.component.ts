import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { NotificationService } from '../../../shared/notification/notification.service';
import { Induction, InductionsService } from '../../../core/services/inductions.service';
import { EMPTY } from 'rxjs';
import { catchError, finalize, timeout } from 'rxjs/operators';

@Component({
  selector: 'app-induction-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './induction-detail.component.html',
})
export class InductionDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(InductionsService);
  private ns = inject(NotificationService);

  induction = signal<Induction | null>(null);
  loading = signal(false);
  errorMessage = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('No se encontro la induccion solicitada.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.service
      .getOne(id)
      .pipe(
        timeout(15000),
        catchError((err) => {
          this.errorMessage.set(err?.error?.message || 'No fue posible cargar el detalle de la induccion.');
          return EMPTY;
        }),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe((data) => {
        this.induction.set(data);
      });
  }

  copyLink() {
    const current = this.induction();
    if (!current?.publicUrl) {
      this.ns.error('No fue posible obtener el link permanente.');
      return;
    }

    navigator.clipboard?.writeText(current.publicUrl);
    this.ns.success('Link copiado al portapapeles.');
  }

  get studentRows() {
    return this.induction()?.students || [];
  }
}