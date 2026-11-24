import { ChangeDetectionStrategy, Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { DOC_TYPES, VerificationDoc } from '../../model/profile';
import { DocumentoService } from '../../services/documento-service';
import { readFile } from '../../core/utilidades';
import { errorMessage } from '../../core/http-error';

/** Modal «Documentos de verificación»: lista y subida (aprobación automática). */
@Component({
  selector: 'app-documentos-dialog-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [A11yModule],
  templateUrl: './documentos-dialog-component.html',
  styleUrl: './documentos-dialog-component.css',
})
export class DocumentosDialogComponent {
  @Input() documentos: VerificationDoc[] = [];
  @Output() cerrar = new EventEmitter<void>();

  documentoService: DocumentoService = inject(DocumentoService);

  readonly tipos = DOC_TYPES;
  tipo = 'DNI';
  nombreArchivo = '';
  error = '';
  private archivo: File | null = null;

  onArchivo(event: Event): void {
    readFile(event.target as HTMLInputElement, (nombre, _url, file) => {
      this.nombreArchivo = nombre;
      this.archivo = file;
      this.error = '';
    });
  }

  subir(): void {
    if (!this.archivo) {
      this.error = 'Selecciona un archivo (PDF o imagen) antes de subirlo.';
      return;
    }
    this.documentoService.insert(this.tipo.toLowerCase(), this.archivo).subscribe({
      next: () => {
        this.nombreArchivo = '';
        this.archivo = null;
        this.error = '';
        this.tipo = 'DNI';
        this.documentoService.actualizarLista();
      },
      error: (e) => (this.error = errorMessage(e)),
    });
  }
}
