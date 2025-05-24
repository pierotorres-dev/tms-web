import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError, map } from 'rxjs';
import { NotificationService } from './notification.service';
import { ErrorMessages, HttpStatusCodes } from '../models/http.model';
import { environment } from '../../../environments/environment';

/**
 * Opciones para las peticiones HTTP
 */
export interface HttpOptions {
  headers?: HttpHeaders;
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  responseType?: any;
  reportProgress?: boolean;
  observe?: 'body' | 'events' | 'response';
  showErrorNotification?: boolean; // Indica si mostrar notificaciones de error automáticamente
}

/**
 * Servicio HTTP personalizado que maneja errores de manera global
 */
@Injectable({
  providedIn: 'root'
})
export class HttpService {
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);

  /**
   * Construye la URL completa, añadiendo el baseURL si es necesario
   * @param url URL relativa o absoluta
   * @returns URL completa
   */
  private buildFullUrl(url: string): string {
    // Si la URL ya es absoluta (empieza con http/https), la devolvemos tal como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Si es una URL relativa, añadimos el baseURL
    const baseUrl = environment.apiUrl;
    
    // Asegurarnos de que no haya dobles barras
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedPath = url.startsWith('/') ? url : `/${url}`;
    
    return `${normalizedBaseUrl}${normalizedPath}`;
  }  /**
   * Realiza una petición GET
   */
  get<T>(url: string, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    // Configuramos observe: 'body' por defecto para recibir directamente el cuerpo de la respuesta
    const finalOptions = { 
      ...httpOptions, 
      observe: 'body' as const 
    };
    
    const fullUrl = this.buildFullUrl(url);
    
    return this.http.get<T>(fullUrl, finalOptions).pipe(
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }
  /**
   * Realiza una petición POST
   */
  post<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    const finalOptions = { 
      ...httpOptions, 
      observe: 'body' as const 
    };
    
    const fullUrl = this.buildFullUrl(url);
    
    return this.http.post<T>(fullUrl, body, finalOptions).pipe(
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }
  /**
   * Realiza una petición PUT
   */
  put<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    const finalOptions = { 
      ...httpOptions, 
      observe: 'body' as const 
    };
    
    const fullUrl = this.buildFullUrl(url);
    
    return this.http.put<T>(fullUrl, body, finalOptions).pipe(
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }  /**
   * Realiza una petición PATCH
   */
  patch<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    const finalOptions = { 
      ...httpOptions, 
      observe: 'body' as const 
    };
    
    const fullUrl = this.buildFullUrl(url);
    
    return this.http.patch<T>(fullUrl, body, finalOptions).pipe(
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }
  /**
   * Realiza una petición DELETE
   */
  delete<T>(url: string, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    const finalOptions = { 
      ...httpOptions, 
      observe: 'body' as const 
    };
    
    const fullUrl = this.buildFullUrl(url);
    
    return this.http.delete<T>(fullUrl, finalOptions).pipe(
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }

  /**
   * Realiza una petición GET pero devuelve la respuesta HTTP completa
   */
  getWithResponse<T>(url: string, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    const finalOptions = { 
      ...httpOptions, 
      observe: 'response' as const 
    };
    
    return this.http.get(url, finalOptions).pipe(
      map(response => response.body as T),
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }

  /**
   * Realiza una petición POST pero devuelve la respuesta HTTP completa
   */
  postWithResponse<T>(url: string, body: any, options?: HttpOptions): Observable<T> {
    const { showErrorNotification, ...httpOptions } = options || {};
    
    const finalOptions = { 
      ...httpOptions, 
      observe: 'response' as const 
    };
    
    return this.http.post(url, body, finalOptions).pipe(
      map(response => response.body as T),
      catchError(error => this.handleError(error, { showErrorNotification }))
    );
  }

  /**
   * Maneja los errores HTTP de manera global
   */
  private handleError(error: HttpErrorResponse, options?: HttpOptions): Observable<never> {
    let errorMessage = ErrorMessages.DEFAULT;
    
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente (red, etc.)
      errorMessage = ErrorMessages.CONNECTION;
    } else {
      // Error del lado del servidor
      switch (error.status) {
        case HttpStatusCodes.UNAUTHORIZED:
          errorMessage = ErrorMessages.UNAUTHORIZED;
          break;
        case HttpStatusCodes.NOT_FOUND:
          errorMessage = ErrorMessages.NOT_FOUND;
          break;
        case HttpStatusCodes.INTERNAL_SERVER_ERROR:
          errorMessage = ErrorMessages.SERVER_ERROR;
          break;
        case HttpStatusCodes.BAD_REQUEST:
          errorMessage = error.error?.message || ErrorMessages.VALIDATION;
          break;
        case HttpStatusCodes.TOO_MANY_REQUESTS:
          errorMessage = ErrorMessages.TOO_MANY_REQUESTS;
          break;
        default:
          errorMessage = error.error?.message || ErrorMessages.DEFAULT;
      }
    }
    
    // Si la opción está habilitada, mostrar notificación de error
    if (options?.showErrorNotification !== false) {
      this.notificationService.error(errorMessage);
    }
    
    // Reenviar el error para que los componentes puedan manejarlo
    return throwError(() => error);
  }

  /**
   * Método utilitario para construir parámetros HTTP a partir de un objeto
   * @param params Objeto con los parámetros a convertir
   * @returns HttpParams
   */
  buildParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      
      if (value !== null && value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => {
            httpParams = httpParams.append(`${key}`, item.toString());
          });
        } else {
          httpParams = httpParams.append(key, value.toString());
        }
      }
    });
    
    return httpParams;
  }
}