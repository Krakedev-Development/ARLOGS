import { InjectionToken } from '@angular/core';
import { AuditEntry, ShipmentJob, UserRole } from '../../models/shipment.model';

export interface SpreadsheetExporterPort {
  exportShipments(jobs: readonly ShipmentJob[], viewerRole: UserRole): Promise<void>;
  exportAuditLogs(entries: readonly AuditEntry[]): Promise<void>;
}

export const SPREADSHEET_EXPORTER_PORT = new InjectionToken<SpreadsheetExporterPort>(
  'SPREADSHEET_EXPORTER_PORT',
);
