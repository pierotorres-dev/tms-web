import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core'; // Import PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // Import isPlatformBrowser
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { AUTH_API, TOKEN_STORAGE } from '../constants/auth.constants';
import { HttpService } from '../../../core/services/http.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
    AuthResponse,
    EmpresaInfo,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
    UserSession
} from '../models/auth.model';
import { environment } from '../../../../environments/environment';

/**
 * Servicio de autenticación que maneja la interacción con el API de auth
 */
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpService);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private platformId = inject(PLATFORM_ID); // Inject PLATFORM_ID

    // BehaviorSubject para manejar el estado de autenticación
    private userSessionSubject = new BehaviorSubject<UserSession | null>(null);
    userSession$ = this.userSessionSubject.asObservable();

    // BehaviorSubject para el estado de carga durante operaciones de autenticación
    private loadingSubject = new BehaviorSubject<boolean>(false);
    loading$ = this.loadingSubject.asObservable();

    /**
     * Al inicializar el servicio, intentamos recuperar la sesión del usuario
     * desde el localStorage si existe
     */
    constructor() {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            this.checkStoredSession();
        }
    }

    /**
     * Comprueba si existe una sesión guardada en el localStorage
     */
    private checkStoredSession(): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            const storedUser = localStorage.getItem(TOKEN_STORAGE.USER_DATA);
            const storedToken = localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN);

            if (storedUser && storedToken) {
                try {
                    const userSession: UserSession = JSON.parse(storedUser);
                    userSession.token = storedToken;
                    this.userSessionSubject.next(userSession);
                } catch (error) {
                    // Si hay un error al parsear los datos, limpiamos el localStorage
                    this.clearSession();
                }
            }
        }
    }

    /**
     * Realiza la autenticación del usuario
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        this.loadingSubject.next(true);

        return this.http.post<LoginResponse>(
            `${environment.apiUrl}${AUTH_API.LOGIN}`,
            credentials,
            { showErrorNotification: false } // Manejamos los errores específicamente en el componente
        ).pipe(
            tap(response => {                // Si el usuario tiene múltiples empresas, se redirigirá a la selección
                if (response.empresas && response.empresas.length > 1) {
                    // Guardamos el token de sesión temporal
                    localStorage.setItem(TOKEN_STORAGE.SESSION_TOKEN, response.sessionToken);
                    localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify({
                        userId: response.userId,
                        userName: response.userName,
                        role: response.role,
                        name: response.name,
                        lastName: response.lastName
                    }));
                    // Guardamos las empresas disponibles para la selección
                    localStorage.setItem(TOKEN_STORAGE.EMPRESAS_LIST, JSON.stringify(response.empresas));

                    this.notificationService.success(`Bienvenido, ${response.name}. Por favor seleccione una empresa.`);
                } else if (response.empresas && response.empresas.length === 1) {
                    // Si solo tiene una empresa, generamos el token directamente
                    this.generateToken(response.userId, response.empresas[0].id, response.sessionToken)
                        .subscribe({
                            next: () => {
                                this.notificationService.success(`Bienvenido, ${response.name}`);
                            }
                        });
                } else {
                    // Si no tiene empresas asociadas, guardamos la información básica
                    this.setUserSession({
                        userId: response.userId,
                        userName: response.userName,
                        role: response.role,
                        token: response.token,
                        name: response.name,
                        lastName: response.lastName
                    });

                    this.notificationService.success(`Bienvenido, ${response.name}`);
                    this.router.navigate(['/dashboard']);
                }
            }),
            catchError(error => {
                this.loadingSubject.next(false);
                throw error;
            }),
            tap(() => this.loadingSubject.next(false))
        );
    }
    /**
     * Genera un token para un usuario y empresa específicos
     */
    generateToken(userId: number, empresaId: number, sessionToken: string): Observable<AuthResponse> {
        this.loadingSubject.next(true);

        const params = this.http.buildParams({
            userId,
            empresaId,
            sessionToken
        });

        return this.http.post<AuthResponse>(
            `${environment.apiUrl}${AUTH_API.GENERATE_TOKEN}`,
            null,
            {
                params,
                showErrorNotification: true
            }
        ).pipe(
            tap(response => {
                // Recuperamos la información de usuario guardada
                const storedUser = localStorage.getItem(TOKEN_STORAGE.USER_DATA);

                if (storedUser) {
                    const userData = JSON.parse(storedUser);

                    // Actualizamos la sesión con el nuevo token y la empresa seleccionada
                    this.setUserSession({
                        ...userData,
                        token: response.token,
                        empresaId
                    });

                    // Eliminamos el token de sesión temporal
                    localStorage.removeItem(TOKEN_STORAGE.SESSION_TOKEN);

                    // Redirigimos al dashboard
                    this.router.navigate(['/dashboard']);
                }
            }),
            catchError(error => {
                this.loadingSubject.next(false);
                throw error;
            }),
            tap(() => this.loadingSubject.next(false))
        );
    }

    /**
     * Refresca el token actual
     */
    refreshToken(): Observable<AuthResponse> {
        const token = localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN);

        if (!token) {
            return of({ token: '' });
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        return this.http.post<AuthResponse>(
            `${environment.apiUrl}${AUTH_API.REFRESH_TOKEN}`,
            null,
            {
                headers,
                showErrorNotification: false // No mostrar notificaciones para errores de refresh token
            }
        ).pipe(
            tap(response => {
                localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, response.token);

                // Actualizamos el token en el subject
                const currentSession = this.userSessionSubject.value;
                if (currentSession) {
                    this.userSessionSubject.next({
                        ...currentSession,
                        token: response.token
                    });
                }
            }),
            catchError(error => {
                // Si hay un error al refrescar el token, cerramos la sesión
                if (error.status === 401) {
                    this.logout();
                }
                throw error;
            })
        );
    }

    /**
     * Valida si el token actual es válido
     */
    validateToken(): Observable<boolean> {
        const token = localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN);

        if (!token) {
            return of(false);
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        return this.http.get<boolean>(
            `${environment.apiUrl}${AUTH_API.VALIDATE_TOKEN}`,
            {
                headers,
                showErrorNotification: false // No mostrar notificaciones para validación de token
            }
        ).pipe(
            catchError(() => of(false))
        );
    }

    /**
     * Registra un nuevo usuario
     */
    register(registerData: RegisterRequest): Observable<UserResponse> {
        this.loadingSubject.next(true);

        return this.http.post<UserResponse>(
            `${environment.apiUrl}${AUTH_API.REGISTER}`,
            registerData,
            { showErrorNotification: true }
        ).pipe(
            tap(response => {
                this.notificationService.success('Usuario registrado correctamente');
            }),
            catchError(error => {
                this.loadingSubject.next(false);
                throw error;
            }),
            tap(() => this.loadingSubject.next(false))
        );
    }

    /**
     * Establece la información de sesión del usuario
     */
    private setUserSession(session: UserSession): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            // Guardamos en localStorage
            localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, session.token);
            localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify({
                userId: session.userId,
                userName: session.userName,
                role: session.role,
                name: session.name,
                lastName: session.lastName,
                empresaId: session.empresaId
            }));

            // Actualizamos el BehaviorSubject
            this.userSessionSubject.next(session);
        }
    }

    /**
     * Comprueba si el usuario está autenticado
     */
    isAuthenticated(): Observable<boolean> {
        return this.userSession$.pipe(
            map(session => !!session && !!session.token)
        );
    }

    /**
     * Obtiene el token actual
     */
    getToken(): string | null {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            return localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN);
        }
        return null;
    }

    /**
     * Obtiene la información de la empresa seleccionada
     */
    getSelectedEmpresa(): EmpresaInfo | null {
        if (isPlatformBrowser(this.platformId)) {
            const storedEmpresa = localStorage.getItem(TOKEN_STORAGE.SELECTED_EMPRESA);
            if (storedEmpresa) {
                try {
                    return JSON.parse(storedEmpresa);
                } catch (error) {
                    console.error('Error parsing selected empresa data:', error);
                    return null;
                }
            }
        }
        return null;
    }

    /**
     * Obtiene la lista de empresas disponibles
     */
    getAvailableEmpresas(): EmpresaInfo[] {
        if (isPlatformBrowser(this.platformId)) {
            const storedEmpresas = localStorage.getItem(TOKEN_STORAGE.EMPRESAS_LIST);
            if (storedEmpresas) {
                try {
                    return JSON.parse(storedEmpresas);
                } catch (error) {
                    console.error('Error parsing empresas list:', error);
                    return [];
                }
            }
        }
        return [];
    }

    /**
     * Cierra la sesión del usuario
     */
    logout(): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            this.clearSession();
        }
        this.router.navigate(['/auth/login']);
    }    /**
     * Limpia los datos de sesión del localStorage
     */
    private clearSession(): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            localStorage.removeItem(TOKEN_STORAGE.AUTH_TOKEN);
            localStorage.removeItem(TOKEN_STORAGE.SESSION_TOKEN);
            localStorage.removeItem(TOKEN_STORAGE.USER_DATA);
            localStorage.removeItem(TOKEN_STORAGE.SELECTED_EMPRESA);
            localStorage.removeItem(TOKEN_STORAGE.EMPRESAS_LIST);
        }
        this.userSessionSubject.next(null);
    }
}