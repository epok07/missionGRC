import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { DemoApiService } from './demo-api.service';

/**
 * Routes every /api request to the in-browser demo backend. Only registered in
 * the static GitHub Pages build, never in the real Express/SSR application.
 */
export const demoApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }
  return inject(DemoApiService).handle(request);
};
