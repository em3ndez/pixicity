import { DisplayComponentService } from './services/shared/displayComponents.service';
import { DisplayComponentModel } from './models/shared/displayComponent.model';
import { Component, DestroyRef, EventEmitter, inject, Output } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { SEOService } from './services/shared/seo.service';
import { SEOModel } from './models/shared/seo.model';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private prerenderTimer: any = null;

  public displayComponent: DisplayComponentModel = {
    mainMenu: true,
    footer: true,
    searchFooter: true,
    submenu: true,
    background: '',
  };

  constructor(
    private displayComponentService: DisplayComponentService,
    private seoService: SEOService,
    private router: Router,
    private title: Title,
    private meta: Meta,
  ) {
    this.displayComponentService
      .getDisplay()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (value: DisplayComponentModel) => (this.displayComponent = value),
      );

    this.seoService
      .getSEO()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: SEOModel) => {
      if (value.title) {
        this.title.setTitle(this.buildTitle(value.title));
        this.meta.updateTag({ property: 'og:title', content: value.title });
        this.meta.updateTag({ name: 'twitter:title', content: value.title });
        this.meta.updateTag({
          property: 'og:site_name',
          content: 'Taringa! - Inteligencia colectiva',
        });
      }

      if (value.description) {
        this.meta.updateTag({
          name: 'description',
          content: value.description,
        });
        this.meta.updateTag({
          property: 'og:description',
          content: value.description,
        });
        this.meta.updateTag({
          name: 'twitter:description',
          content: value.description,
        });
      }

      if (value.tags?.length) {
        this.meta.updateTag({
          name: 'keywords',
          content: value.tags.join(', ').toLowerCase(),
        });
      }

      if (value.imageURL) {
        // og:image debe ser absoluta: las redes y Google descartan las relativas.
        const imagen = this.toAbsoluteUrl(value.imageURL);
        this.meta.updateTag({ property: 'og:image', content: imagen });
        this.meta.updateTag({ name: 'twitter:image', content: imagen });
        this.meta.updateTag({
          name: 'twitter:card',
          content: 'summary_large_image',
        });
      }

      if (value.type) {
        this.meta.updateTag({ property: 'og:type', content: value.type });
      }

      // article:* solo tiene sentido cuando og:type es 'article'.
      this.setArticleMeta(value);

      if (value.canonical) {
        this.setCanonical(value.canonical);
        this.meta.updateTag({ property: 'og:url', content: value.canonical });
      }

      this.meta.updateTag({
        name: 'robots',
        content: value.noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1',
      });

      this.setJsonLd(value.jsonLd);
      this.setPrerenderStatus(value.statusCode);

      // La pagina ya tiene su SEO real: el prerender puede capturar el HTML.
      this.markPrerenderReady();
    });

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evt) => {
      if (evt instanceof NavigationStart) {
        // Antes de activar la ruta: el HTML todavia no es el definitivo.
        this.resetPrerenderReady();
        return;
      }

      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0);
      // Canonical por defecto = URL absoluta actual (sin query params).
      // Si una página setea uno específico vía SEOService, lo sobrescribe.
      const origin = this.document.location.origin;
      const [path, query] = evt.urlAfterRedirects.split('?');
      // Se conserva ?page= : cada pagina de un listado es una URL distinta y
      // necesita canonical propio, si no Google descarta las paginas 2..N.
      const page = new URLSearchParams(query ?? '').get('page');
      const sufijo = page && page !== '1' ? `?page=${encodeURIComponent(page)}` : '';
      this.setCanonical(`${origin}${path}${sufijo}`);
    });
  }

  /**
   * El server de prerender espera window.prerenderReady=true antes de
   * serializar el DOM. Se resetea en cada navegacion y se marca listo cuando
   * la pagina publica su SEO; el timer es el fallback para vistas que no lo hacen.
   */
  private resetPrerenderReady(): void {
    (window as any).prerenderReady = false;

    if (this.prerenderTimer) {
      clearTimeout(this.prerenderTimer);
    }

    this.prerenderTimer = setTimeout(() => this.markPrerenderReady(), 6000);
  }

  private markPrerenderReady(): void {
    if (this.prerenderTimer) {
      clearTimeout(this.prerenderTimer);
      this.prerenderTimer = null;
    }

    (window as any).prerenderReady = true;
  }

  /**
   * Google corta el title alrededor de los 60 caracteres. Se agrega la marca
   * solo si entra; si el titulo ya es largo, el sufijo solo robaria espacio.
   */
  private buildTitle(titulo: string): string {
    const MAX = 60;
    const sufijoCorto = ' - Taringa';
    const sufijoLargo = ' - Taringa - Inteligencia colectiva';

    if (/taringa/i.test(titulo)) {
      return titulo;
    }

    if (titulo.length + sufijoLargo.length <= MAX) {
      return `${titulo}${sufijoLargo}`;
    }

    if (titulo.length + sufijoCorto.length <= MAX) {
      return `${titulo}${sufijoCorto}`;
    }

    return titulo;
  }

  private setArticleMeta(value: SEOModel): void {
    const tags: [string, string | undefined][] = [
      ['article:published_time', value.publishedTime],
      ['article:modified_time', value.modifiedTime],
      ['article:author', value.author],
      ['article:section', value.section],
    ];

    for (const [property, content] of tags) {
      if (value.type === 'article' && content) {
        this.meta.updateTag({ property, content });
      } else {
        this.meta.removeTag(`property='${property}'`);
      }
    }
  }

  private toAbsoluteUrl(url: string): string {
    if (!url || /^https?:\/\//i.test(url)) {
      return url;
    }

    const origin = this.document.location.origin;
    return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  private setJsonLd(data: any): void {
    const head = this.document.head;
    let script = head.querySelector('script[type="application/ld+json"][data-page-seo]');

    if (!data) {
      script?.remove();
      return;
    }

    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-page-seo', '');
      head.appendChild(script);
    }

    script.textContent = JSON.stringify(data);
  }

  /** Prerender lee estos metas para devolver el status HTTP real (evita soft 404). */
  private setPrerenderStatus(statusCode?: number): void {
    const existing = this.document.head.querySelector('meta[name="prerender-status-code"]');
    existing?.remove();

    if (!statusCode || statusCode === 200) {
      return;
    }

    const meta = this.document.createElement('meta');
    meta.setAttribute('name', 'prerender-status-code');
    meta.setAttribute('content', String(statusCode));
    this.document.head.appendChild(meta);
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let link: HTMLLinkElement | null = head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
