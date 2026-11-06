import type { HttpInterceptorFn } from '@angular/common/http';
import { apiBaseInterceptor } from './api-base.interceptor';

/** HTTP interceptors for the real Express/SSR application. */
export const APP_INTERCEPTORS: HttpInterceptorFn[] = [apiBaseInterceptor];

export const DEMO_MODE = false;
