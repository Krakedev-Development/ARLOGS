import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShipmentJob, MILESTONE_DEFINITIONS } from '../../models/shipment.model';
import { ShipmentService } from '../../services/shipment.service';
import { ToastService } from '../../services/toast.service';
import { StatusPillComponent } from '../../presentation/ui/atoms/status-pill/status-pill.component';
import { MilestoneStepperComponent } from '../../presentation/ui/organisms/milestone-stepper/milestone-stepper.component';

type MilestoneFieldKey =
  | 'h1_asignacion'
  | 'h2_respuestaShipper'
  | 'h3_cargaLista'
  | 'h4_zarpeAtd'
  | 'h5_arriboAta'
  | 'h6_pesoRecibido'
  | 'h7_declaracion'
  | 'h8_pagoLiquidacion'
  | 'h9_salidaAutorizada'
  | 'h10_informeSalida';

@Component({
  selector: 'app-job-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPillComponent, MilestoneStepperComponent],
  templateUrl: './job-detail-modal.component.html',
  styleUrl: './job-detail-modal.component.css',
})
export class JobDetailModalComponent implements OnChanges {
  @Input() job: ShipmentJob | null = null;
  @Input() isReadOnly = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ refArlogs: string; changes: Partial<ShipmentJob> }>();

  private readonly shipmentService = inject(ShipmentService);
  private readonly toastService = inject(ToastService);
  readonly milestoneDefs = MILESTONE_DEFINITIONS;

  editForm: Partial<ShipmentJob> = {};
  previewJob: Partial<ShipmentJob> = {};
  liveWeightPct = 'N/A';
  isWeightDiscrepancy = false;
  chronologicalWarning: string | null = null;
  carrierTrackingStatus: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['job'] && this.job) {
      this.carrierTrackingStatus = null;
      this.initForm();
    }
  }

  private initForm(): void {
    if (!this.job) return;
    this.editForm = {
      guiaMaster: this.job.guiaMaster,
      hawbHbl: this.job.hawbHbl,
      contenedor: this.job.contenedor,
      h1_asignacion: this.job.h1_asignacion,
      h2_respuestaShipper: this.job.h2_respuestaShipper,
      h3_cargaLista: this.job.h3_cargaLista,
      h4_zarpeAtd: this.job.h4_zarpeAtd,
      h5_arriboAta: this.job.h5_arriboAta,
      h6_pesoRecibido: this.job.h6_pesoRecibido,
      h7_declaracion: this.job.h7_declaracion,
      h8_pagoLiquidacion: this.job.h8_pagoLiquidacion,
      h9_salidaAutorizada: this.job.h9_salidaAutorizada,
      h10_informeSalida: this.job.h10_informeSalida,
      pesoOrigen: this.job.pesoOrigen,
      pesoRecibido: this.job.pesoRecibido,
      responsablePago: this.job.responsablePago ?? '',
      aforoAduana: this.job.aforoAduana ?? '',
      regimenAduana: this.job.regimenAduana ?? '',
      distritoAduana: this.job.distritoAduana ?? '',
    };
    this.recalculatePreview();
  }

  isApplicable(milestoneNum: number): boolean {
    if (!this.job) return false;
    return this.shipmentService.isMilestoneApplicable(
      this.job.servicio,
      this.job.aduanaPorArlogs,
      milestoneNum,
    );
  }

  private getMilestoneField(milestoneNum: number): MilestoneFieldKey | undefined {
    const def = this.milestoneDefs.find((m) => m.num === milestoneNum);
    return def?.field as MilestoneFieldKey | undefined;
  }

  getMilestoneDate(milestoneNum: number): string | null {
    const field = this.getMilestoneField(milestoneNum);
    return field ? (this.editForm[field] ?? null) : null;
  }

  setMilestoneDate(milestoneNum: number, value: string): void {
    const field = this.getMilestoneField(milestoneNum);
    if (field) {
      this.editForm[field] = value || null;
      this.recalculatePreview();
    }
  }

  onWeightChange(): void {
    this.recalculatePreview();
  }

  private recalculatePreview(): void {
    if (!this.job) return;
    this.chronologicalWarning = null;
    if (this.editForm.h1_asignacion) {
      for (let i = 2; i <= 10; i++) {
        const d = this.getMilestoneDate(i);
        if (d && d < this.editForm.h1_asignacion) {
          this.chronologicalWarning = `Advertencia cronológica: H${i} (${d}) es anterior a H1 Asignación (${this.editForm.h1_asignacion}).`;
          break;
        }
      }
    }
    const merged = { ...this.job, ...this.editForm };
    this.previewJob = this.shipmentService.calculateJobMetrics(
      merged,
      this.shipmentService.alertThresholdDays(),
    );
    this.liveWeightPct = this.previewJob.diferenciaPesoPct || 'N/A';
    this.isWeightDiscrepancy =
      this.liveWeightPct !== 'N/A' &&
      (this.liveWeightPct.startsWith('+') || this.liveWeightPct.startsWith('-'));
  }

  saveChanges(): void {
    if (!this.job) return;
    if (this.isReadOnly) {
      this.toastService.warning(
        'Modo solo lectura',
        'Tu perfil actual no puede modificar hitos operativos.',
      );
      return;
    }
    if (this.chronologicalWarning) {
      this.toastService.error('Incorrecto — Validación de fechas', this.chronologicalWarning);
      return;
    }
    this.save.emit({
      refArlogs: this.job.refArlogs,
      changes: this.editForm,
    });
  }

  checkCarrierTracking(): void {
    if (!this.job) return;
    const guide = (this.editForm.guiaMaster || '').trim();
    const container = (this.editForm.contenedor || '').trim();
    const docRef =
      container && container !== 'N/A' && container !== 'PENDIENTE' ? container : guide;

    if (!docRef || docRef === 'PENDIENTE' || docRef === 'N/A') {
      this.carrierTrackingStatus =
        'Asigne una Guía Máster / BL o N° Contenedor válido para sincronizar el rastreo.';
      this.toastService.warning(
        'Tracking pendiente',
        'Ingrese primero la Guía Máster / BL o Contenedor.',
      );
      return;
    }

    let step = 'Pre-alerta registrada en origen';
    if (this.previewJob?.h10_informeSalida) {
      step = `Carga nacionalizada y entregada (${this.previewJob.h10_informeSalida})`;
    } else if (this.previewJob?.h5_arriboAta) {
      step = `Arribo confirmado en destino GYE (${this.previewJob.h5_arriboAta}) — en gestión portuaria/aduana`;
    } else if (this.previewJob?.h4_zarpeAtd) {
      step = `En tránsito internacional desde ${this.job.puertoEmbarque} (ATD ${this.previewJob.h4_zarpeAtd})`;
    }

    this.carrierTrackingStatus = `Sincronizado (${docRef}): ${step}.`;
    this.toastService.info('Tracking Carrier Actualizado', `${docRef}: ${step}`);
  }

  closeModal(): void {
    this.close.emit();
  }
}
