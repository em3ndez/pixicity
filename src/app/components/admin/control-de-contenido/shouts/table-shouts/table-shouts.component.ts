import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { IHttpPerfilService } from 'src/app/services/interfaces/httpPerfil.interface';
import { PaginationService } from 'src/app/services/shared/pagination.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-table-shouts',
  templateUrl: './table-shouts.component.html',
  styleUrls: ['./table-shouts.component.scss'],
})
export class TableShoutsComponent implements OnInit {
  public shouts: any[] = [];
  public totalCount: number = 0;

  constructor(
    public paginationService: PaginationService,
    private perfilService: IHttpPerfilService
  ) {
    this.paginationService.change({ pageIndex: 0, pageSize: 10, length: 0 });
  }

  ngOnInit(): void {
    this.getShouts();
  }

  getShouts(): void {
    this.perfilService.getShoutsAdmin().subscribe((response: any) => {
      this.shouts = response.shouts;
      this.totalCount = response.pagination.totalCount;
    });
  }

  deleteShout(id: number, index: number): void {
    this.perfilService.deleteShout(id).subscribe((response: any) => {
      if (response) {
        Swal.fire({
          title: 'Eliminado',
          text: 'El shout ha sido eliminado exitosamente',
          icon: 'success',
          timer: 3000,
        });

        this.shouts.splice(index, 1);
      }
    });
  }

  pageChange(event: PageEvent): void {
    this.paginationService.change(event);
    this.getShouts();
  }
}
