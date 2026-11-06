import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The GitHub Pages build is a client-rendered SPA. GitHub Pages has no server
 * runtime, so no route can use RenderMode.Server.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
