import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINTS, NETWORK_CONFIG } from '../../core/config/api-endpoints.config';
import {
  AuditEntry,
  Quotation,
  RoleUser,
  ScreenId,
  ShipmentJob,
  UserRole,
  WarehouseItem,
  WarehouseMovement,
} from '../../models/shipment.model';
import { SupabaseRowMapper } from './supabase-row.mapper';
import { SupabasePayloadBuilder } from './supabase-payload.builder';

@Injectable({
  providedIn: 'root',
})
export class ArlogsRemoteSyncAdapter {
  private readonly http = inject(HttpClient);
  readonly isBackendConnected = signal<boolean>(false);
  readonly accessToken = signal<string | null>(null);

  private sbUrl(tableAndQuery: string): string {
    return `${NETWORK_CONFIG.supabaseUrl}/rest/v1/${tableAndQuery}`;
  }

  private sbHeaders(upsert = false): { headers: HttpHeaders } {
    const key = NETWORK_CONFIG.supabasePublishableKey;
    let headers = new HttpHeaders({
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    });
    if (upsert) {
      headers = headers.set('Prefer', 'resolution=merge-duplicates,return=minimal');
    }
    return { headers };
  }

  async fetchClientMap(): Promise<Map<string, string>> {
    try {
      const rows = await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_core_client?select=*'),
          this.sbHeaders(),
        ),
      );
      return new Map(rows.map((r) => [String(r['acc_id']), String(r['acc_company_name'])]));
    } catch {
      return new Map([
        ['CLI-001', 'Industrias Andinas S.A.'],
        ['CLI-002', 'Comercial Pacífico Cía. Ltda.'],
      ]);
    }
  }

  async fetchUsersAndRbac(): Promise<{
    users: RoleUser[];
    matrix: Partial<Record<UserRole, ScreenId[]>>;
  }> {
    const clientMap = await this.fetchClientMap();
    const [userRows, rbacRows] = await Promise.all([
      firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_security_user?select=*&order=asu_id.asc'),
          this.sbHeaders(),
        ),
      ),
      firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_security_role_permission?select=*'),
          this.sbHeaders(),
        ),
      ),
    ]);
    return {
      users: userRows.map((u) => SupabaseRowMapper.toRoleUser(u, clientMap)),
      matrix: SupabaseRowMapper.toRbacMatrix(rbacRows),
    };
  }

  async fetchShipments(): Promise<ShipmentJob[]> {
    try {
      const jobs = await firstValueFrom(
        this.http.get<ShipmentJob[]>(API_ENDPOINTS.shipments.base()),
      );
      this.isBackendConnected.set(true);
      if (Array.isArray(jobs) && jobs.length > 0) return jobs;
    } catch {
      // Direct Supabase PostgreSQL fallback
    }

    const clientMap = await this.fetchClientMap();
    const [shipments, milestones, pos] = await Promise.all([
      firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_ops_shipment?select=*&order=aos_ref.asc'),
          this.sbHeaders(),
        ),
      ),
      firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_ops_milestone?select=*'),
          this.sbHeaders(),
        ),
      ),
      firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_ops_purchase_order?select=*'),
          this.sbHeaders(),
        ),
      ),
    ]);

    const mMap = new Map(milestones.map((m) => [String(m['aom_shipment_ref']), m]));
    const poMap = new Map<string, string[]>();
    for (const p of pos) {
      const ref = String(p['aop_shipment_ref']);
      poMap.set(ref, [...(poMap.get(ref) ?? []), String(p['aop_po_code'])]);
    }
    this.isBackendConnected.set(true);
    return shipments.map((s) => {
      const ref = String(s['aos_ref']);
      const cid = String(s['aos_client_id']);
      return SupabaseRowMapper.toShipmentJob(
        s,
        mMap.get(ref),
        poMap.get(ref) ?? [],
        clientMap.get(cid) ?? cid,
      );
    });
  }

  async fetchQuotations(): Promise<Quotation[]> {
    const clientMap = await this.fetchClientMap();
    const rows = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(
        this.sbUrl('arl_pricing_quotation?select=*&order=apq_sequence_number.desc'),
        this.sbHeaders(),
      ),
    );
    return rows.map((q) =>
      SupabaseRowMapper.toQuotation(
        q,
        clientMap.get(String(q['apq_client_id'])) ?? String(q['apq_client_id']),
      ),
    );
  }

  async fetchWarehouseItems(): Promise<WarehouseItem[]> {
    const clientMap = await this.fetchClientMap();
    const rows = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(
        this.sbUrl('arl_whs_item?select=*&order=awi_id.asc'),
        this.sbHeaders(),
      ),
    );
    return rows.map((i) =>
      SupabaseRowMapper.toWarehouseItem(
        i,
        clientMap.get(String(i['awi_client_id'])) ?? String(i['awi_client_id']),
      ),
    );
  }

  async fetchWarehouseMovements(): Promise<WarehouseMovement[]> {
    const rows = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(
        this.sbUrl('arl_whs_movement?select=*&order=awm_id.desc'),
        this.sbHeaders(),
      ),
    );
    return rows.map((m) => SupabaseRowMapper.toWarehouseMovement(m));
  }

  async fetchAuditLogs(): Promise<AuditEntry[]> {
    const rows = await firstValueFrom(
      this.http.get<Record<string, unknown>[]>(
        this.sbUrl('arl_audit_log?select=*&order=aal_id.desc'),
        this.sbHeaders(),
      ),
    );
    return rows.map((a) => SupabaseRowMapper.toAuditEntry(a));
  }

  async fetchSlaThreshold(): Promise<number> {
    try {
      const rows = await firstValueFrom(
        this.http.get<Record<string, unknown>[]>(
          this.sbUrl('arl_core_parameter?acp_key=eq.SLA_OPEN_THRESHOLD_DAYS&select=*'),
          this.sbHeaders(),
        ),
      );
      return rows.length > 0
        ? Number(rows[0]['acp_value'])
        : NETWORK_CONFIG.defaultSlaThresholdDays;
    } catch {
      return NETWORK_CONFIG.defaultSlaThresholdDays;
    }
  }

  async pushSlaThreshold(thresholdDays: number): Promise<void> {
    await this.execSb(
      this.http.patch(
        this.sbUrl('arl_core_parameter?acp_key=eq.SLA_OPEN_THRESHOLD_DAYS'),
        { acp_value: String(thresholdDays) },
        this.sbHeaders(),
      ),
    );
  }

  async pushMilestoneOrBillingPatch(refArlogs: string, patch: Partial<ShipmentJob>): Promise<void> {
    const { sPatch, mPatch } = SupabasePayloadBuilder.buildShipmentAndMilestonePatches(patch);
    if (Object.keys(sPatch).length > 0) {
      await this.execSb(
        this.http.patch(
          this.sbUrl(`arl_ops_shipment?aos_ref=eq.${encodeURIComponent(refArlogs)}`),
          sPatch,
          this.sbHeaders(),
        ),
      );
    }
    if (Object.keys(mPatch).length > 0) {
      await this.execSb(
        this.http.patch(
          this.sbUrl(`arl_ops_milestone?aom_shipment_ref=eq.${encodeURIComponent(refArlogs)}`),
          mPatch,
          this.sbHeaders(),
        ),
      );
    }
  }

  async pushCreateQuotation(q: Quotation, seq: number): Promise<void> {
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_pricing_quotation'),
        SupabasePayloadBuilder.buildQuotationInsert(q, seq),
        this.sbHeaders(true),
      ),
    );
  }

  async pushUpdateQuotation(id: string, patch: Partial<Quotation>): Promise<void> {
    await this.execSb(
      this.http.patch(
        this.sbUrl(`arl_pricing_quotation?apq_id=eq.${encodeURIComponent(id)}`),
        SupabasePayloadBuilder.buildQuotationPatch(patch),
        this.sbHeaders(),
      ),
    );
  }

  async pushDeleteQuotation(id: string): Promise<void> {
    await this.execSb(
      this.http.delete(
        this.sbUrl(`arl_pricing_quotation?apq_id=eq.${encodeURIComponent(id)}`),
        this.sbHeaders(),
      ),
    );
  }

  async pushApproveQuotation(quotationId: string, job: ShipmentJob): Promise<void> {
    await this.execSb(
      this.http.patch(
        this.sbUrl(`arl_pricing_quotation?apq_id=eq.${encodeURIComponent(quotationId)}`),
        { apq_status: 'APROBADA', apq_generated_ref: job.refArlogs },
        this.sbHeaders(),
      ),
    );
    await this.pushCreateDirectShipment(job);
  }

  async pushCreateDirectShipment(job: ShipmentJob): Promise<void> {
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_ops_shipment'),
        SupabasePayloadBuilder.buildShipmentInsert(job),
        this.sbHeaders(true),
      ),
    );
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_ops_milestone'),
        { aom_shipment_ref: job.refArlogs, aom_h1_assignment_date: job.h1_asignacion },
        this.sbHeaders(true),
      ),
    );
    for (const po of job.ordenesCompra) {
      await this.execSb(
        this.http.post(
          this.sbUrl('arl_ops_purchase_order'),
          { aop_shipment_ref: job.refArlogs, aop_client_id: job.clienteId, aop_po_code: po },
          this.sbHeaders(true),
        ),
      );
    }
  }

  async pushDeleteShipment(refArlogs: string): Promise<void> {
    await this.execSb(
      this.http.delete(
        this.sbUrl(`arl_ops_shipment?aos_ref=eq.${encodeURIComponent(refArlogs)}`),
        this.sbHeaders(),
      ),
    );
  }

  async pushWarehouseReceipt(item: WarehouseItem, mov: WarehouseMovement): Promise<void> {
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_whs_item'),
        SupabasePayloadBuilder.buildWarehouseItemInsert(item),
        this.sbHeaders(true),
      ),
    );
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_whs_movement'),
        SupabasePayloadBuilder.buildWarehouseMovementInsert(mov),
        this.sbHeaders(true),
      ),
    );
  }

  async pushWarehouseDispatch(item: WarehouseItem, mov: WarehouseMovement): Promise<void> {
    await this.execSb(
      this.http.patch(
        this.sbUrl(`arl_whs_item?awi_id=eq.${encodeURIComponent(item.id)}`),
        {
          awi_available_qty: item.cantidadDisponible,
          awi_status: item.estado,
          awi_last_remission_guide: item.ultimaGuiaRemision,
        },
        this.sbHeaders(),
      ),
    );
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_whs_movement'),
        SupabasePayloadBuilder.buildWarehouseMovementInsert(mov),
        this.sbHeaders(true),
      ),
    );
  }

  async pushAuditRecord(entry: AuditEntry): Promise<void> {
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_audit_log'),
        SupabasePayloadBuilder.buildAuditInsert(entry),
        this.sbHeaders(true),
      ),
    );
  }

  async pushCreateUser(u: RoleUser): Promise<void> {
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_security_user'),
        SupabasePayloadBuilder.buildUserInsert(u),
        this.sbHeaders(true),
      ),
    );
  }

  async pushUpdateUser(id: string, patch: Partial<RoleUser>): Promise<void> {
    await this.execSb(
      this.http.patch(
        this.sbUrl(`arl_security_user?asu_id=eq.${encodeURIComponent(id)}`),
        SupabasePayloadBuilder.buildUserPatch(patch),
        this.sbHeaders(),
      ),
    );
  }

  async pushDeleteUser(id: string): Promise<void> {
    await this.execSb(
      this.http.delete(
        this.sbUrl(`arl_security_user?asu_id=eq.${encodeURIComponent(id)}`),
        this.sbHeaders(),
      ),
    );
  }

  async pushRbacToggle(role: UserRole, screenId: ScreenId, isAllowed: boolean): Promise<void> {
    await this.execSb(
      this.http.post(
        this.sbUrl('arl_security_role_permission'),
        SupabasePayloadBuilder.buildRbacUpsert(role, screenId, isAllowed),
        this.sbHeaders(true),
      ),
    );
  }

  private async execSb(obs: ReturnType<HttpClient['post']>): Promise<void> {
    try {
      await firstValueFrom(obs);
      this.isBackendConnected.set(true);
    } catch {
      // Keep UI reactive even during network blips
    }
  }
}
