import { Component, OnInit } from '@angular/core';
import { SEOService } from 'src/app/services/shared/seo.service';

@Component({
  standalone: false,
  selector: 'app-post-privado',
  templateUrl: './post-privado.component.html',
  styleUrls: ['./post-privado.component.scss']
})
export class PostPrivadoComponent implements OnInit {

  constructor(private seoService: SEOService) { }

  ngOnInit(): void {
    this.seoService.setSEO({
      title: 'Post privado',
      description: 'Este post es privado.',
      type: 'website',
      imageURL: '',
      tags: [],
      noIndex: true,
      statusCode: 403,
    });
  }

}
