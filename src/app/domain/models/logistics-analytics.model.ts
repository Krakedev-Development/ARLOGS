import { MILESTONE_DEFINITIONS, MilestoneDefinition } from '../../models/shipment.model';

export type StageDependencyOwner =
  | 'Shipper (proveedor del cliente)'
  | 'Forwarder y línea (aerolínea o naviera)'
  | 'ARLOGS'
  | 'Cliente o ARLOGS (según responsable del pago)';

export interface StageDependencyRule {
  readonly code: string;
  readonly label: string;
  readonly formulaLabel: string;
  readonly dependsOn: StageDependencyOwner;
}

export const STAGE_DEPENDENCY_RULES: readonly StageDependencyRule[] = [
  {
    code: 'RESPUESTA_SHIPPER',
    label: 'Respuesta del shipper',
    formulaLabel: 'H2 − H1',
    dependsOn: 'Shipper (proveedor del cliente)',
  },
  {
    code: 'ALISTAMIENTO',
    label: 'Alistamiento de carga',
    formulaLabel: 'H3 − H1',
    dependsOn: 'Shipper (proveedor del cliente)',
  },
  {
    code: 'COORDINACION_ORIGEN',
    label: 'Coordinación real de origen',
    formulaLabel: 'H4 − H1',
    dependsOn: 'Shipper (proveedor del cliente)',
  },
  {
    code: 'TRANSITO',
    label: 'Tránsito internacional',
    formulaLabel: 'H5 − H4',
    dependsOn: 'Forwarder y línea (aerolínea o naviera)',
  },
  {
    code: 'ARRIBO_DECLARACION',
    label: 'Arribo a declaración',
    formulaLabel: 'H7 − H5',
    dependsOn: 'ARLOGS',
  },
  {
    code: 'DECLARACION_PAGO',
    label: 'Declaración a pago',
    formulaLabel: 'H8 − H7',
    dependsOn: 'Cliente o ARLOGS (según responsable del pago)',
  },
  {
    code: 'PAGO_INFORME',
    label: 'Pago a informe de salida',
    formulaLabel: 'H10 − H8',
    dependsOn: 'ARLOGS',
  },
] as const;

export interface MonthlyShipmentBucket {
  readonly monthCode: string;
  readonly monthLabel: string;
  readonly count: number;
  readonly percentage: number;
}

export interface PurchaseOrderRelationRow {
  readonly ordenCompra: string;
  readonly refArlogs: string;
  readonly shipper: string;
  readonly servicio: string;
  readonly estado: string;
}

export interface PurchaseOrderSummary {
  readonly distinctPoCount: number;
  readonly multiPoShipmentsCount: number;
  readonly rows: readonly PurchaseOrderRelationRow[];
}

export interface CustomsGroupBucket {
  readonly label: string;
  readonly count: number;
  readonly percentage: number;
}

export interface CustomsAnalyticsSummary {
  readonly totalCustomsJobs: number;
  readonly byRegimen: readonly CustomsGroupBucket[];
  readonly byDistrito: readonly CustomsGroupBucket[];
  readonly byAforo: readonly CustomsGroupBucket[];
}

export { MILESTONE_DEFINITIONS };
export type { MilestoneDefinition };
