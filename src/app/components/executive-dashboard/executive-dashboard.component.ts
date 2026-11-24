import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentService } from '../../services/shipment.service';
import { AuditService } from '../../services/audit.service';
import { ToastService } from '../../services/toast.service';
import { ShipmentJob } from '../../models/shipment.model';
import { LogisticsAnalyticsEngine } from '../../domain/services/logistics-analytics.engine';
import { StatusPillComponent } from '../../presentation/ui/atoms/status-pill/status-pill.component';
import { PaginationBarComponent } from '../../presentation/ui/molecules/pagination-bar/pagination-bar.component';
import {
  KpiStatCardItem,
  KpiStatRibbonComponent,
} from '../../presentation/ui/organisms/kpi-stat-ribbon/kpi-stat-ribbon.component';
import { JobDetailModalComponent } from '../job-detail-modal/job-detail-modal.component';

@Component({
  selector: 'app-executive-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    StatusPillComponent,
    PaginationBarComponent,
    KpiStatRibbonComponent,
    JobDetailModalComponent,
  ],
  templateUrl: './executive-dashboard.component.html',
  styleUrl: './executive-dashboard.component.css',
})
export class ExecutiveDashboardComponent {
  private readonly shipmentService = inject(ShipmentService);
  private readonly auditService = inject(AuditService);
  private readonly toastService = inject(ToastService);

  private thresholdToastTimer: ReturnType<typeof setTimeout> | null = null;
  readonly auditSearch = signal('');
  readonly currentThreshold = this.shipmentService.alertThresholdDays;
  readonly jobs = this.shipmentService.jobs;
  readonly selectedDrilldownJob = signal<ShipmentJob | null>(null);

  auditPage = signal(1);
  auditPageSize = signal(5);

  readonly filteredAudit = computed(() => {
    const q = this.auditSearch().trim().toLowerCase();
    const logs = this.auditService.logs();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.usuario.toLowerCase().includes(q) ||
        l.entidad.toLowerCase().includes(q) ||
        l.rol.toLowerCase().includes(q) ||
        l.accion.toLowerCase().includes(q) ||
        l.detalle.toLowerCase().includes(q),
    );
  });

  readonly totalAuditPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredAudit().length / this.auditPageSize())),
  );

  readonly paginatedAudit = computed(() => {
    const page = Math.min(this.auditPage(), this.totalAuditPages());
    const start = (page - 1) * this.auditPageSize();
    return this.filteredAudit().slice(start, start + this.auditPageSize());
  });

  readonly stats = computed(() => {
    const list = this.jobs();
    const total = list.length;
    const abiertos = list.filter((j) => j.estado === 'ABIERTO').length;
    const demorados = list.filter((j) => j.estado === 'REVISAR').length;
    const cerrados = list.filter((j) => j.estado === 'CERRADO').length;

    return {
      total,
      abiertos,
      abiertosPorcentaje: total ? Math.round((abiertos / total) * 100) : 0,
      demorados,
      cerrados,
      cerradosPorcentaje: total ? Math.round((cerrados / total) * 100) : 0,
    };
  });

  readonly kpiItems = computed<readonly KpiStatCardItem[]>(() => {
    const s = this.stats();
    return [
      {
        label: 'Total Embarques',
        value: s.total,
        icon: 'bi-box-seam',
        iconBgClass: 'bg-slate-100 text-dark',
        valueColorClass: 'text-dark',
      },
      {
        label: 'En Curso',
        value: `${s.abiertos} (${s.abiertosPorcentaje}%)`,
        icon: 'bi-arrow-repeat',
        iconBgClass: 'bg-blue-50 text-primary',
        valueColorClass: 'text-primary',
      },
      {
        label: `Demorados (>${this.currentThreshold()}d)`,
        value: s.demorados,
        icon: 'bi-exclamation-triangle',
        iconBgClass: 'bg-amber-50 text-warning',
        valueColorClass: 'text-amber-600',
      },
      {
        label: 'Cerrados',
        value: `${s.cerrados} (${s.cerradosPorcentaje}%)`,
        icon: 'bi-check2-circle',
        iconBgClass: 'bg-emerald-50 text-success',
        valueColorClass: 'text-success',
      },
    ];
  });

  readonly delayedJobs = computed(() => this.jobs().filter((j) => j.estado === 'REVISAR'));

  readonly averages = computed(() => {
    const list = this.jobs();
    return {
      respShipper: LogisticsAnalyticsEngine.averageOfMetric(
        list.map((j) => j.diasRespuestaShipper),
      ),
      alistamiento: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasAlistamiento)),
      coordinacionOrigen: LogisticsAnalyticsEngine.averageOfMetric(
        list.map((j) => j.diasCoordinacionOrigen),
      ),
      transito: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasTransito)),
      arriboDeclaracion: LogisticsAnalyticsEngine.averageOfMetric(
        list.map((j) => j.diasArriboDeclaracion),
      ),
      declaracionPago: LogisticsAnalyticsEngine.averageOfMetric(
        list.map((j) => j.diasDeclaracionPago),
      ),
      pagoInforme: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasPagoInforme)),
      aduana: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasEnAduana)),
      cicloTotal: LogisticsAnalyticsEngine.averageOfMetric(list.map((j) => j.diasCicloTotal)),
    };
  });

  readonly commercialStats = computed(() => {
    const list = this.jobs();
    let cotizado = 0;
    let facturado = 0;
    let profitReal = 0;
    let pendientes = 0;
    for (const j of list) {
      cotizado += j.valorVentaCotizado ?? 0;
      if (j.valorFacturadoReal !== undefined) {
        facturado += j.valorFacturadoReal;
        profitReal += j.valorFacturadoReal - (j.costoReal ?? j.costoEstimadoCotizado ?? 0);
      } else {
        pendientes++;
      }
    }
    return { cotizado, facturado, profitReal, pendientes };
  });

  readonly shipperComparison = computed(() => {
    const map = new Map<
      string,
      { origen: string; count: number; resp: number[]; orig: number[] }
    >();
    for (const j of this.jobs()) {
      if (!j.shipper || j.shipper === 'N/A') continue;
      const cur = map.get(j.shipper) ?? {
        origen: `${j.paisOrigen} (${j.servicio})`,
        count: 0,
        resp: [],
        orig: [],
      };
      cur.count++;
      if (typeof j.diasRespuestaShipper === 'number') cur.resp.push(j.diasRespuestaShipper);
      if (typeof j.diasCoordinacionOrigen === 'number') cur.orig.push(j.diasCoordinacionOrigen);
      map.set(j.shipper, cur);
    }
    return Array.from(map.entries())
      .map(([shipper, v]) => ({
        shipper,
        origen: v.origen,
        count: v.count,
        avgResp: LogisticsAnalyticsEngine.averageOfMetric(v.resp),
        avgOrigen: LogisticsAnalyticsEngine.averageOfMetric(v.orig),
      }))
      .sort((a, b) => b.avgOrigen - a.avgOrigen || b.count - a.count)
      .slice(0, 5);
  });

  readonly modalitySummary = computed(() => {
    const list = this.jobs();
    const total = Math.max(1, list.length);
    const defs: { key: string; label: string; icon: string; barClass: string }[] = [
      { key: 'AEREO', label: 'Aéreo (A)', icon: 'bi-airplane', barClass: 'bg-slate-900' },
      { key: 'FCL', label: 'FCL (F)', icon: 'bi-box-seam', barClass: 'bg-slate-800' },
      { key: 'LCL', label: 'LCL (L)', icon: 'bi-boxes', barClass: 'bg-slate-700' },
      { key: 'CUSTOMS', label: 'Customs (C)', icon: 'bi-shield-check', barClass: 'bg-slate-600' },
      { key: 'COURIER', label: 'Courier (AC)', icon: 'bi-send', barClass: 'bg-slate-500' },
      { key: 'INLAND', label: 'Inland (I)', icon: 'bi-truck', barClass: 'bg-slate-500' },
    ];
    return defs.map((d) => {
      const count = list.filter((j) => j.servicio === d.key).length;
      return {
        label: d.label,
        icon: d.icon,
        barClass: d.barClass,
        count,
        pct: list.length ? Math.round((count / total) * 100) : 0,
      };
    });
  });

  exportAudit(): void {
    const logs = this.auditService.logs();
    this.auditService.exportAuditExcel(logs);
    this.toastService.success(
      'Correcto — Auditoría exportada',
      `Se descargó el reporte Excel con ${logs.length} eventos de control.`,
    );
  }

  onThresholdChange(days: number): void {
    const val = Number(days);
    this.shipmentService.setAlertThreshold(val);
    if (this.thresholdToastTimer) {
      clearTimeout(this.thresholdToastTimer);
    }
    this.thresholdToastTimer = setTimeout(() => {
      this.toastService.info(
        'Actualizado — Umbral SLA',
        `Tolerancia operativa ajustada a ${val} días abiertos.`,
      );
    }, 400);
  }

  openDrilldown(job: ShipmentJob): void {
    this.selectedDrilldownJob.set(job);
  }

  onDrilldownSave(event: { refArlogs: string; changes: Partial<ShipmentJob> }): void {
    try {
      const updated = this.shipmentService.updateJobMilestones(event.refArlogs, event.changes);
      this.selectedDrilldownJob.set(null);
      this.toastService.success(
        'Actualizado — Hitos guardados',
        `Referencia ${updated.refArlogs} recalculada.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar hitos.';
      this.toastService.error('Incorrecto', msg);
    }
  }
}
