import { ChangeDetectionStrategy, Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { ReporteService } from '../../services/reporte-service';
import { SolicitudService } from '../../services/solicitud-service';
import { PublicacionService } from '../../services/publicacion-service';
import { MaterialMes, ResumenMes } from '../../model/reporte';
import { MATERIALS } from '../../model/material';
import { cap, fmtNum, matKey } from '../../core/mappers';
import { isoDate } from '../../core/utilidades';

/** Resumen del mes con datos reales del backend (GET /reports/summary y /reports/materials). */
@Component({
  selector: 'app-resumen-mes-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [],
  templateUrl: './resumen-mes-component.html',
  styleUrl: './resumen-mes-component.css',
})
export class ResumenMesComponent implements OnInit, OnDestroy {
  @Input() kgLabel = 'kg recuperados';
  @Input() countLabel = 'recojos';

  reporteService: ReporteService = inject(ReporteService);
  solicitudService: SolicitudService = inject(SolicitudService);
  publicacionService: PublicacionService = inject(PublicacionService);

  resumen: ResumenMes | null = null;
  materiales: MaterialMes[] = [];
  private suscripciones: Subscription[] = [];

  ngOnInit(): void {
    this.cargar();
    // Cada vez que cambian las entregas (se completó o canceló una) se recalcula el mes.
    this.suscripciones.push(this.solicitudService.getListaCambio().subscribe(() => this.cargar()));
    this.suscripciones.push(this.publicacionService.getListaCambio().subscribe(() => this.cargar()));
  }

  ngOnDestroy(): void {
    this.suscripciones.forEach((s) => s.unsubscribe());
  }

  cargar(): void {
    const hoy = new Date();
    const desde = isoDate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const hasta = isoDate(hoy);
    forkJoin([this.reporteService.summary(desde, hasta), this.reporteService.materials(desde, hasta)]).subscribe({
      next: ([r, m]) => {
        this.resumen = {
          kg: fmtNum(r.kgTotales),
          total: String(r.totalRecojos ?? 0),
          rating: r.calificacionPromedio != null ? Number(r.calificacionPromedio).toFixed(1) : '—',
          compliance: r.cumplimiento != null ? Math.round(Number(r.cumplimiento)) + '%' : '—',
        };
        const max = Math.max(1, ...m.map((x) => Number(x.kilos)));
        this.materiales = m.map((x) => ({
          label: cap(x.material),
          kg: fmtNum(x.kilos) + ' kg',
          pct: Math.round((Number(x.kilos) / max) * 100),
          color: MATERIALS[matKey(x.material)]?.color ?? '#a3d24a',
        }));
      },
      error: (err) => console.error('Error cargando el resumen del mes', err),
    });
  }
}
