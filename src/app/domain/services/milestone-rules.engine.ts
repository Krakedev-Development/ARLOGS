import { JobStatus, ServicePrefix, ServiceType, ShipmentJob } from '../../models/shipment.model';
import { NETWORK_CONFIG } from '../../core/config/api-endpoints.config';

export class MilestoneRulesEngine {
  static readonly SERVICE_PREFIX_MAP: Record<ServiceType, ServicePrefix> = {
    AEREO: 'A',
    FCL: 'F',
    LCL: 'L',
    CUSTOMS: 'C',
    COURIER: 'AC',
    INLAND: 'I',
  };

  static isMilestoneApplicable(
    service: ServiceType,
    aduanaPorArlogs: 'SI' | 'NO' | 'N/A',
    milestoneNum: number,
  ): boolean {
    if (service === 'INLAND') {
      return milestoneNum === 1;
    }
    if (service === 'CUSTOMS') {
      return [1, 5, 7, 8, 9, 10].includes(milestoneNum);
    }
    if (service === 'COURIER') {
      return [1, 5, 6, 7, 8, 9, 10].includes(milestoneNum);
    }
    if (aduanaPorArlogs === 'NO') {
      return milestoneNum >= 1 && milestoneNum <= 6;
    }
    return milestoneNum >= 1 && milestoneNum <= 10;
  }

  static getFinalMilestoneNum(
    service: ServiceType,
    aduanaPorArlogs: 'SI' | 'NO' | 'N/A',
  ): number {
    if (service === 'INLAND') return 0;
    if (aduanaPorArlogs === 'NO' && ['AEREO', 'FCL', 'LCL'].includes(service)) {
      return 6;
    }
    return 10;
  }

  static calculateCalendarDays(
    startIso: string | null | undefined,
    endIso: string | null | undefined,
  ): number | 'N/A' {
    if (!startIso || !endIso) return 'N/A';
    const d1 = new Date(`${startIso}T00:00:00`);
    const d2 = new Date(`${endIso}T00:00:00`);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 'N/A';
    return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  static calculateWeightDifferencePct(
    pesoOrigen: number | null | undefined,
    pesoRecibido: number | null | undefined,
  ): string | 'N/A' {
    if (
      pesoOrigen === null ||
      pesoOrigen === undefined ||
      pesoOrigen <= 0 ||
      pesoRecibido === null ||
      pesoRecibido === undefined
    ) {
      return 'N/A';
    }
    const diffPct = ((pesoRecibido - pesoOrigen) / pesoOrigen) * 100;
    const sign = diffPct > 0 ? '+' : '';
    return `${sign}${diffPct.toFixed(1)}%`;
  }

  static calculateJobMetrics(
    job: ShipmentJob,
    thresholdDays: number,
    referenceDate: Date = new Date(`${NETWORK_CONFIG.simulatedReferenceDateIso}T00:00:00`),
  ): ShipmentJob {
    const s = job.servicio;
    const aduana = job.aduanaPorArlogs;
    const can = (num: number) => this.isMilestoneApplicable(s, aduana, num);

    const diasRespuestaShipper =
      can(2) && job.h1_asignacion && job.h2_respuestaShipper
        ? this.calculateCalendarDays(job.h1_asignacion, job.h2_respuestaShipper)
        : 'N/A';

    const diasAlistamiento =
      can(3) && job.h1_asignacion && job.h3_cargaLista
        ? this.calculateCalendarDays(job.h1_asignacion, job.h3_cargaLista)
        : 'N/A';

    const diasCoordinacionOrigen =
      can(4) && job.h1_asignacion && job.h4_zarpeAtd
        ? this.calculateCalendarDays(job.h1_asignacion, job.h4_zarpeAtd)
        : 'N/A';

    const diasTransito =
      can(4) && can(5) && job.h4_zarpeAtd && job.h5_arriboAta
        ? this.calculateCalendarDays(job.h4_zarpeAtd, job.h5_arriboAta)
        : 'N/A';

    const diasGestionSinAduana =
      aduana === 'NO' && ['AEREO', 'FCL', 'LCL'].includes(s) && job.h1_asignacion && job.h6_pesoRecibido
        ? this.calculateCalendarDays(job.h1_asignacion, job.h6_pesoRecibido)
        : 'N/A';

    const diasArriboDeclaracion =
      can(7) && job.h5_arriboAta && job.h7_declaracion
        ? this.calculateCalendarDays(job.h5_arriboAta, job.h7_declaracion)
        : 'N/A';

    const diasDeclaracionPago =
      can(8) && job.h7_declaracion && job.h8_pagoLiquidacion
        ? this.calculateCalendarDays(job.h7_declaracion, job.h8_pagoLiquidacion)
        : 'N/A';

    const diasPagoInforme =
      can(10) && job.h8_pagoLiquidacion && job.h10_informeSalida
        ? this.calculateCalendarDays(job.h8_pagoLiquidacion, job.h10_informeSalida)
        : 'N/A';

    const diasEnAduana =
      can(9) && job.h7_declaracion && job.h9_salidaAutorizada
        ? this.calculateCalendarDays(job.h7_declaracion, job.h9_salidaAutorizada)
        : 'N/A';

    const diasCicloTotal =
      can(10) && job.h1_asignacion && job.h10_informeSalida
        ? this.calculateCalendarDays(job.h1_asignacion, job.h10_informeSalida)
        : 'N/A';

    const diferenciaPesoPct = this.calculateWeightDifferencePct(job.pesoOrigen, job.pesoRecibido);
    const closure = this.resolveStatusAndOpenDays(job, thresholdDays, referenceDate);

    return {
      ...job,
      diasRespuestaShipper,
      diasAlistamiento,
      diasCoordinacionOrigen,
      diasTransito,
      diasGestionSinAduana,
      diasArriboDeclaracion,
      diasDeclaracionPago,
      diasPagoInforme,
      diasEnAduana,
      diasCicloTotal,
      diferenciaPesoPct,
      diasAbiertos: closure.diasAbiertos,
      estado: closure.estado,
      alertaDemora: closure.alertaDemora,
    };
  }

  private static resolveStatusAndOpenDays(
    job: ShipmentJob,
    thresholdDays: number,
    referenceDate: Date,
  ): { estado: JobStatus; diasAbiertos: number | 'N/A'; alertaDemora: boolean } {
    if (job.servicio === 'INLAND') {
      return { estado: 'N/A', diasAbiertos: 'N/A', alertaDemora: false };
    }

    const isClosed =
      job.aduanaPorArlogs === 'NO' && ['AEREO', 'FCL', 'LCL'].includes(job.servicio)
        ? Boolean(job.h6_pesoRecibido)
        : Boolean(job.h10_informeSalida);

    if (isClosed) {
      return { estado: 'CERRADO', diasAbiertos: 'N/A', alertaDemora: false };
    }

    if (!job.h1_asignacion) {
      return { estado: 'ABIERTO', diasAbiertos: 'N/A', alertaDemora: false };
    }

    const d1 = new Date(`${job.h1_asignacion}T00:00:00`);
    const rawDiff = Math.round((referenceDate.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    const diasAbiertos = rawDiff >= 0 ? rawDiff : 0;
    const isDelayed = diasAbiertos > thresholdDays;

    return {
      estado: isDelayed ? 'REVISAR' : 'ABIERTO',
      diasAbiertos,
      alertaDemora: isDelayed,
    };
  }
}
