import type { HttpInterceptorFn } from '@angular/common/http';
import { demoApiInterceptor } from './demo/demo-api.interceptor';

/**
 * HTTP interceptors for the static GitHub Pages demo. This file replaces
 * runtime.ts in the "demo" build configuration via angular.json.
 */
export const APP_INTERCEPTORS: HttpInterceptorFn[] = [demoApiInterceptor];

export const DEMO_MODE = true;
