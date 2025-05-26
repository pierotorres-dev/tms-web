import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core'; // Import PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // Import isPlatformBrowser
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';

import { AUTH_API, TOKEN_STORAGE } from '../constants/auth.constants';
import { HttpService } from '../../../core/services/http.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
    AuthResponse,
    EmpresaInfo,
    LoginRequest,
    LoginResponse,
    RegisterRequest, UserResponse,
    UserSession
} from '../models/auth.model';

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
    loading$ = this.loadingSubject.asObservable();    // BehaviorSubject para la empresa actualmente seleccionada
    private selectedEmpresaSubject = new BehaviorSubject<EmpresaInfo | null>(null);
    selectedEmpresa$ = this.selectedEmpresaSubject.asObservable();

    // BehaviorSubject para el estado de inicialización
    private initializationSubject = new BehaviorSubject<boolean>(false);
    isInitialized$ = this.initializationSubject.asObservable();

    // Observable para obtener el empresaId de forma reactiva
    empresaId$ = this.selectedEmpresa$.pipe(
        map(empresa => empresa?.id || null)
    );/**
     * Al inicializar el servicio, intentamos recuperar la sesión del usuario
     * desde el localStorage si existe
     */
    constructor() {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            // this.checkStoredSession(); // We'll call this via APP_INITIALIZER
        }
    }    /**
     * Comprueba si existe una sesión guardada en el localStorage.
     * This method will be called by the APP_INITIALIZER.
     */
    public performInitialSessionCheck(): Promise<void> {
        return new Promise((resolve) => {
            if (isPlatformBrowser(this.platformId)) {
                this.checkStoredSession().then(() => {
                    // Marcar como inicializado después de verificar la sesión
                    this.initializationSubject.next(true);
                    resolve();
                });
            } else {
                // Si no estamos en el browser, simplemente marcar como inicializado
                this.initializationSubject.next(true);
                resolve();
            }
        });
    }

    /**
     * Comprueba si existe una sesión guardada en el localStorage
     */
    private checkStoredSession(): Promise<void> {
        return new Promise((resolve) => {
            if (!isPlatformBrowser(this.platformId)) {
                resolve();
                return;
            }

            const storedUser = localStorage.getItem(TOKEN_STORAGE.USER_DATA);
            const storedToken = localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN);
            const storedEmpresa = localStorage.getItem(TOKEN_STORAGE.SELECTED_EMPRESA);

            if (storedUser && storedToken) {
                try {
                    // Validar el token antes de restaurar la sesión
                    this.validateStoredToken(storedToken).subscribe({
                        next: (isValid) => {
                            if (isValid) {
                                // El token es válido, restaurar la sesión
                                const userSession: UserSession = JSON.parse(storedUser);
                                userSession.token = storedToken;
                                this.userSessionSubject.next(userSession);

                                // También restaurar la empresa seleccionada si existe
                                if (storedEmpresa) {
                                    const empresaInfo: EmpresaInfo = JSON.parse(storedEmpresa);
                                    this.selectedEmpresaSubject.next(empresaInfo);
                                }
                            } else {
                                // El token no es válido, limpiar la sesión
                                this.clearSession();
                            }
                            resolve();
                        },
                        error: () => {
                            // Error al validar, limpiar la sesión
                            this.clearSession();
                            resolve();
                        }
                    });
                } catch (error) {
                    // Si hay un error al parsear los datos, limpiamos el localStorage
                    this.clearSession();
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    /**
     * Valida un token almacenado sin mostrar notificaciones de error
     */
    private validateStoredToken(token: string): Observable<boolean> {
        const headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
        });

        return this.http.get<boolean>(
            AUTH_API.VALIDATE_TOKEN,
            {
                headers,
                showErrorNotification: false
            }
        ).pipe(
            catchError(() => of(false))
        );
    }    /**
     * Realiza la autenticación del usuario
     * 
     * Flujo según el número de empresas:
     * - Múltiples empresas: Se almacenan datos temporales y sessionToken para posterior selección
     * - Una empresa: Se usa el token final directamente sin necesidad de generateToken
     * - Sin empresas: Se configura sesión básica sin empresaId
     */
    login(credentials: LoginRequest): Observable<LoginResponse> {
        this.loadingSubject.next(true);

        return this.http.post<LoginResponse>(
            AUTH_API.LOGIN,
            credentials,
            { showErrorNotification: false } // Manejamos los errores específicamente en el componente
        ).pipe(
            tap(response => {
                this.handleLoginResponse(response);
            }),
            catchError(error => {
                this.loadingSubject.next(false);
                throw error;
            }),
            tap(() => this.loadingSubject.next(false))
        );
    }

    /**
     * Maneja la respuesta del login según el número de empresas asignadas al usuario
     */
    private handleLoginResponse(response: LoginResponse): void {
        const flujoAutenticacion = this.determineAuthFlow(response.empresas);

        // Validar los requisitos según el flujo de autenticación
        const requisitosValidos = this.validateAuthFlowRequirements(flujoAutenticacion, response);
        if (!requisitosValidos) {
            this.notificationService.error('Error: Datos de autenticación inválidos. Contacte al administrador.');
            this.loadingSubject.next(false);
            return;
        }

        switch (flujoAutenticacion) {
            case 'multiple':
                // Múltiples empresas: guardar datos temporales y redirigir a selección
                this.handleMultipleEmpresasScenario(response);
                break;
            case 'single':
                // Una sola empresa: usar el token directamente sin generateToken
                this.handleSingleEmpresaScenario(response);
                break;
            case 'none':
                // Sin empresas: configurar sesión básica
                this.handleNoEmpresasScenario(response);
                break;
        }
    }    /**
     * Maneja el escenario cuando el usuario tiene múltiples empresas asignadas
     */
    private handleMultipleEmpresasScenario(response: LoginResponse): void {
        // Validar que tenemos el sessionToken necesario para múltiples empresas
        if (!response.sessionToken) {
            this.notificationService.error('Error: Token de sesión no recibido. Contacte al administrador.');
            this.loadingSubject.next(false);
            return;
        }

        // Guardamos el token de sesión temporal para usar con generateToken
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
        // La redirección a select-empresa se maneja en el componente login
    }

    /**
     * Maneja el escenario cuando el usuario tiene una sola empresa asignada
     */
    private handleSingleEmpresaScenario(response: LoginResponse): void {
        const empresa = response.empresas[0];

        // Validar que tenemos el token necesario para una empresa
        if (!response.token) {
            this.notificationService.error('Error: Token de autenticación no recibido. Contacte al administrador.');
            this.loadingSubject.next(false);
            return;
        }

        // Establecer la sesión completa con el token ya proporcionado
        this.setUserSession({
            userId: response.userId,
            userName: response.userName,
            role: response.role,
            token: response.token, // Usar el token del login directamente
            empresaId: empresa.id,
            name: response.name,
            lastName: response.lastName
        });

        // Establecer la empresa seleccionada
        this.setSelectedEmpresa(empresa);

        this.notificationService.success(`Bienvenido a ${empresa.nombre}, ${response.name}`);
        this.router.navigate(['/dashboard']);
    }

    /**
     * Maneja el escenario cuando el usuario no tiene empresas asignadas
     */
    private handleNoEmpresasScenario(response: LoginResponse): void {
        // Configurar sesión básica sin empresa
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
    }    /**
     * Método auxiliar para determinar el flujo de autenticación basado en las empresas
     */
    private determineAuthFlow(empresas: EmpresaInfo[] | null): 'multiple' | 'single' | 'none' {
        if (!empresas || empresas.length === 0) {
            return 'none';
        }
        return empresas.length > 1 ? 'multiple' : 'single';
    }

    /**
     * Valida los datos necesarios para cada flujo de autenticación
     */
    private validateAuthFlowRequirements(flow: 'multiple' | 'single' | 'none', response: LoginResponse): boolean {
        switch (flow) {
            case 'multiple':
                return !!response.sessionToken && !!response.empresas && response.empresas.length > 1;
            case 'single':
                return !!response.token && !!response.empresas && response.empresas.length === 1;
            case 'none':
                return !!response.token;
            default:
                return false;
        }
    }

    /**
     * Genera un token para un usuario y empresa específicos
     * 
     * Este método debe usarse SOLO cuando:
     * - El usuario tiene múltiples empresas asignadas
     * - Se tiene un sessionToken válido del login inicial
     * - El usuario ha seleccionado una empresa específica
     * 
     * NO usar cuando el usuario tiene una sola empresa (el token ya viene en el login)
     */
    generateToken(userId: number, empresaId: number, sessionToken: string): Observable<AuthResponse> {
        // Validación preventiva
        if (!sessionToken) {
            this.notificationService.error('Error: Token de sesión requerido para generar token de empresa.');
            return throwError(() => new Error('Session token required'));
        }

        this.loadingSubject.next(true);

        const params = this.http.buildParams({
            userId,
            empresaId,
            sessionToken
        }); return this.http.post<AuthResponse>(
            AUTH_API.GENERATE_TOKEN,
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

                    // Buscar y establecer la información completa de la empresa
                    const storedEmpresas = localStorage.getItem(TOKEN_STORAGE.EMPRESAS_LIST);
                    if (storedEmpresas) {
                        const empresas: EmpresaInfo[] = JSON.parse(storedEmpresas);
                        const empresaSeleccionada = empresas.find(emp => emp.id === empresaId);
                        if (empresaSeleccionada) {
                            this.setSelectedEmpresa(empresaSeleccionada);
                        }
                    }

                    // Eliminamos el token de sesión temporal y la lista de empresas
                    localStorage.removeItem(TOKEN_STORAGE.SESSION_TOKEN);
                    //localStorage.removeItem(TOKEN_STORAGE.EMPRESAS_LIST);

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
        }); return this.http.post<AuthResponse>(
            AUTH_API.REFRESH_TOKEN,
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
        }); return this.http.get<boolean>(
            AUTH_API.VALIDATE_TOKEN,
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
        this.loadingSubject.next(true); return this.http.post<UserResponse>(
            AUTH_API.REGISTER,
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
     * Cambia la empresa actualmente seleccionada
     */
    selectEmpresa(empresa: EmpresaInfo): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            // Guardamos la empresa seleccionada en el localStorage
            localStorage.setItem(TOKEN_STORAGE.SELECTED_EMPRESA, JSON.stringify(empresa));

            // Actualizamos el BehaviorSubject de la empresa seleccionada
            this.selectedEmpresaSubject.next(empresa);
        }
    }

    /**
     * Establece la empresa seleccionada
     */
    setSelectedEmpresa(empresa: EmpresaInfo): void {
        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem(TOKEN_STORAGE.SELECTED_EMPRESA, JSON.stringify(empresa));
            this.selectedEmpresaSubject.next(empresa);

            // También actualizar el empresaId en la sesión del usuario
            const currentSession = this.userSessionSubject.value;
            if (currentSession) {
                const updatedSession = { ...currentSession, empresaId: empresa.id };
                this.userSessionSubject.next(updatedSession);

                // Actualizar el localStorage con el empresaId
                localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify({
                    userId: updatedSession.userId,
                    userName: updatedSession.userName,
                    role: updatedSession.role,
                    name: updatedSession.name,
                    lastName: updatedSession.lastName,
                    empresaId: empresa.id
                }));
            }
        }
    }

    /**
     * Obtiene el ID de la empresa actualmente seleccionada
     */
    getCurrentEmpresaId(): number | null {
        const selectedEmpresa = this.selectedEmpresaSubject.value;
        return selectedEmpresa?.id || null;
    }

    /**
     * Verifica si hay una empresa seleccionada
     */
    hasSelectedEmpresa(): boolean {
        return this.getCurrentEmpresaId() !== null;
    }

    /**
     * Observable que emite true si hay una empresa seleccionada
     */
    get hasEmpresaSelected$(): Observable<boolean> {
        return this.selectedEmpresa$.pipe(
            map(empresa => empresa !== null)
        );
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
        this.selectedEmpresaSubject.next(null);
    }
}