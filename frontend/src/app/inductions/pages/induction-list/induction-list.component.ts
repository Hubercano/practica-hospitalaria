import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { InductionsService, Induction } from '../../../core/services/inductions.service';
import { NotificationService } from '../../../shared/notification/notification.service';

@Component({
  selector: 'app-induction-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonComponent],
  templateUrl: './induction-list.component.html',
})
export class InductionListComponent implements OnInit {
  inductions = signal<Induction[]>([]);

  private service = inject(InductionsService);
  private router = inject(Router);
  private ns = inject(NotificationService);

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.service.getAll().subscribe({
      next: (data) => this.inductions.set(data || []),
      error: (err) => this.ns.error(err?.error?.message || 'No fue posible cargar inducciones.'),
    });
  }

  goToCreate() {
    this.router.navigate(['/inductions/new']);
  }

  viewDetail(item: Induction) {
    this.router.navigate(['/inductions', item.id]);
  }

  editInduction(item: Induction) {
    this.router.navigate(['/inductions', item.id, 'edit']);
  }

  copyLink(item: Induction) {
    if (item.publicUrl) {
      navigator.clipboard?.writeText(item.publicUrl);
      this.ns.success('Link copiado al portapapeles.');
      return;
    }

    this.service.getPermanentLink(item.id).subscribe({
      next: (res) => {
        navigator.clipboard?.writeText(res.url);
        this.ns.success('Link copiado al portapapeles.');
      },
      error: (err) => this.ns.error(err?.error?.message || 'No fue posible copiar el link.'),
    });
  }
}
