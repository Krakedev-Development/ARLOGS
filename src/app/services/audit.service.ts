import { Injectable, inject, signal } from '@angular/core';
import { AuditCategory, AuditEntry, UserRole } from '../models/shipment.model';
import { ArlogsRemoteSyncAdapter } from '../infrastructure/http/arlogs-remote-sync.adapter';

@Injectable({
  providedIn: 'root',
})
export class AuditService {
  private readonly remoteSync = inject(ArlogsRemoteSyncAdapter);
  readonly logs = signal<AuditEntry[]>([]);

  constructor() {
    void this.hydrateAuditLogsFromDatabase();
  }

  async hydrateAuditLogsFromDatabase(): Promise<void> {
    const rows = await this.remoteSync.fetchAuditLogs();
    this.logs.set(rows);
  }

  record(entry: {
    usuario: string;
    email: string;
    rol: UserRole;
    categoria: AuditCategory;
    entidad: string;
    accion: string;
    detalle: string;
  }): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newEntry: AuditEntry = {
      id: `AUD-${Date.now().toString().slice(-6)}`,
      timestamp: ts,
      ...entry,
    };

    this.logs.update((list) => [newEntry, ...list]);
    void this.remoteSync.pushAuditRecord(newEntry);
  }

  async exportAuditExcel(entries: AuditEntry[]): Promise<void> {
    const rows = entries.map((e) => ({
      'ID Evento': e.id,
      'Fecha y Hora': e.timestamp,
      Usuario: e.usuario,
      Correo: e.email,
      Rol: e.rol,
      Categoría: e.categoria,
      'Entidad / Ref': e.entidad,
      Acción: e.accion,
      'Detalle del Cambio': e.detalle,
    }));
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria ARLOGS');
    XLSX.writeFile(wb, `ARLOGS_Auditoria_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
