import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { DashboardResumen } from 'src/app/models/admin/dashboard.model';
import { IHttpGeneralService } from '../interfaces/httpGeneral.interface';

/**
 * Estado del panel de administración. El resumen se pide una vez y lo comparten la portada
 * y el sidebar (que antes disparaba 5 peticiones sólo para pintar sus badges).
 */
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly generalService = inject(IHttpGeneralService);

  private readonly _resumen$ = new BehaviorSubject<DashboardResumen | null>(null);
  private readonly _cargando$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);
  private readonly _actualizado$ = new BehaviorSubject<Date | null>(null);

  public readonly resumen$ = this._resumen$.asObservable();
  public readonly cargando$ = this._cargando$.asObservable();
  public readonly error$ = this._error$.asObservable();
  public readonly actualizado$ = this._actualizado$.asObservable();

  get resumen(): DashboardResumen | null {
    return this._resumen$.value;
  }

  /** Pide el resumen sólo si aún no hay datos en memoria. */
  cargarSiHaceFalta(): void {
    if (this._resumen$.value === null && !this._cargando$.value) {
      this.refrescar().subscribe();
    }
  }

  refrescar(): Observable<DashboardResumen | null> {
    this._cargando$.next(true);
    this._error$.next(null);

    return this.generalService.getDashboardResumen().pipe(
      tap((resumen) => {
        this._resumen$.next(resumen);
        this._actualizado$.next(new Date());
      }),
      catchError(() => {
        this._error$.next('No se pudo cargar el resumen del panel.');
        return of(null);
      }),
      finalize(() => this._cargando$.next(false)),
    );
  }

  /** Contador pendiente por clave de cola ("reporte-1", "contactos", ...). */
  pendientesPorClave(clave: string): number {
    return this._resumen$.value?.pendientes?.find((p) => p.clave === clave)?.cantidad ?? 0;
  }
}
