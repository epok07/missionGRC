import { HttpInterceptorFn } from '@angular/common/http';
import { inject, REQUEST } from '@angular/core';

/**
 * During SSR the app talks to its own Express API. The browser keeps relative
 * URLs. Cookies are forwarded so the server render uses the signed-in session,
 * and the HTTP transfer cache then hydrates the browser without re-fetching.
 */
export const apiBaseInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }

  const serverRequest = inject(REQUEST, { optional: true });
  if (!serverRequest) {
    return next(request);
  }

  const host = serverRequest.headers.get('host') ?? 'localhost:4000';
  const port = /:(\d+)$/.exec(host)?.[1] ?? '4000';
  const forwardedHeaders = request.headers.set(
    'cookie',
    serverRequest.headers.get('cookie') ?? '',
  );
  const acceptLanguage = serverRequest.headers.get('accept-language');
  if (acceptLanguage) {
    forwardedHeaders.set('accept-language', acceptLanguage);
  }

  return next(
    request.clone({
      url: `http://127.0.0.1:${port}${request.url}`,
      headers: forwardedHeaders,
    }),
  );
};
