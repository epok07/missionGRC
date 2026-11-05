import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth
    .ensureSession()
    .pipe(
      map((user) =>
        user ? true : router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } }),
      ),
    );
};

export const publicOnlyGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(
    map((user) => {
      if (!user) return true;
      const returnTo = route.queryParams['returnTo'];
      return router.parseUrl(typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/');
    }),
  );
};
