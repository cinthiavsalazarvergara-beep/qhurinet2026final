import { ChangeDetectionStrategy, AfterViewInit, Component, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import {
  MatCell, MatCellDef, MatColumnDef, MatHeaderCell, MatHeaderCellDef,
  MatHeaderRow, MatHeaderRowDef, MatRow, MatRowDef, MatTable, MatTableDataSource,
} from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
import { Historial } from '../../model/reporte';

/** Tabla «Historial de actividad» (mat-table con paginador y orden) y exportación CSV/PDF. */
@Component({
  selector: 'app-historial-component',
  // Angular 22 usa OnPush por defecto; Eager revisa el componente en cada ciclo, como en la referencia (Angular 20).
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    MatTable, MatColumnDef, MatHeaderCellDef, MatHeaderCell, MatCellDef, MatCell,
    MatHeaderRowDef, MatHeaderRow, MatRowDef, MatRow, MatPaginator, MatSort, MatSortHeader,
  ],
  templateUrl: './historial-component.html',
  styleUrl: './historial-component.css',
})
export class HistorialComponent implements OnChanges, AfterViewInit {
  @Input() historial: Historial[] = [];
  @Output() exportar = new EventEmitter<'csv' | 'pdf'>();

  displayedColumns: string[] = ['type', 'material', 'party', 'date', 'rating'];
  dataSource: MatTableDataSource<Historial> = new MatTableDataSource<Historial>();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  ngOnChanges(): void {
    this.dataSource.data = this.historial;
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }
}
