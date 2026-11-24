import { ShipmentJob } from '../../models/shipment.model';
import {
  CustomsAnalyticsSummary,
  CustomsGroupBucket,
  MonthlyShipmentBucket,
  PurchaseOrderRelationRow,
  PurchaseOrderSummary,
} from '../models/logistics-analytics.model';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Enero',
  '02': 'Febrero',
  '03': 'Marzo',
  '04': 'Abril',
  '05': 'Mayo',
  '06': 'Junio',
  '07': 'Julio',
  '08': 'Agosto',
  '09': 'Septiembre',
  '10': 'Octubre',
  '11': 'Noviembre',
  '12': 'Diciembre',
};

export class LogisticsAnalyticsEngine {
  static averageOfMetric(values: readonly (number | 'N/A' | undefined)[]): number {
    const validNumbers = values.filter((v): v is number => typeof v === 'number');
    if (validNumbers.length === 0) return 0;
    const sum = validNumbers.reduce((acc, item) => acc + item, 0);
    return Math.round((sum / validNumbers.length) * 10) / 10;
  }

  static computeMonthlyDistribution(jobs: readonly ShipmentJob[]): MonthlyShipmentBucket[] {
    const total = jobs.length || 1;
    const counts = new Map<string, number>();

    for (const job of jobs) {
      if (!job.h1_asignacion) continue;
      const monthCode = job.h1_asignacion.split('-')[1];
      if (!monthCode) continue;
      counts.set(monthCode, (counts.get(monthCode) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthCode, count]) => ({
        monthCode,
        monthLabel: MONTH_NAMES[monthCode] ?? `Mes ${monthCode}`,
        count,
        percentage: jobs.length ? Math.round((count / total) * 100) : 0,
      }));
  }

  static computePurchaseOrderSummary(jobs: readonly ShipmentJob[]): PurchaseOrderSummary {
    const distinctPos = new Set<string>();
    let multiPoShipmentsCount = 0;
    const rows: PurchaseOrderRelationRow[] = [];

    for (const job of jobs) {
      if (job.ordenesCompra.length > 1) {
        multiPoShipmentsCount++;
      }
      for (const oc of job.ordenesCompra) {
        const cleanOc = oc.trim();
        if (!cleanOc) continue;
        distinctPos.add(cleanOc);
        rows.push({
          ordenCompra: cleanOc,
          refArlogs: job.refArlogs,
          shipper: job.shipper,
          servicio: job.servicio,
          estado: job.estado ?? 'ABIERTO',
        });
      }
    }

    return {
      distinctPoCount: distinctPos.size,
      multiPoShipmentsCount,
      rows,
    };
  }

  static computeCustomsAnalytics(jobs: readonly ShipmentJob[]): CustomsAnalyticsSummary {
    const customsJobs = jobs.filter(
      (j) => j.aduanaPorArlogs === 'SI' || j.servicio === 'CUSTOMS' || j.servicio === 'COURIER',
    );
    const total = customsJobs.length;

    const groupField = (selector: (j: ShipmentJob) => string | undefined): CustomsGroupBucket[] => {
      const map = new Map<string, number>();
      for (const job of customsJobs) {
        const key = selector(job)?.trim() || 'Sin especificar';
        if (key === 'N/A') continue;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      return Array.from(map.entries())
        .map(([label, count]) => ({
          label,
          count,
          percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);
    };

    return {
      totalCustomsJobs: total,
      byRegimen: groupField((j) => j.regimenAduana),
      byDistrito: groupField((j) => j.distritoAduana),
      byAforo: groupField((j) => j.aforoAduana),
    };
  }
}
