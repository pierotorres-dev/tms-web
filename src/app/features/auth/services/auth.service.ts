import { HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core'; // Import PLATFORM_ID
import { isPlatformBrowser } from '@angular/common'; // Import isPlatformBrowser
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError, delay, retry, timer, switchMap } from 'rxjs';

import { AUTH_API, TOKEN_STORAGE, SESSION_CONFIG } from '../constants/auth.constants';
import { HttpService } from '../../../core/services/http.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TokenManagerService } from '../../../core/services/token-manager.service';
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
    private tokenManager = inject(TokenManagerService);
    private platformId = inject(PLATFORM_ID); // Inject PLATFORM_ID

    // BehaviorSubject para manejar el estado de autenticación
    private userSessionSubject = new BehaviorSubject<UserSession | null>(null);
    userSession$ = this.userSessionSubject.asObservable();

    // BehaviorSubject para el estado de carga durante operaciones de autenticación
    private loadingSubject = new BehaviorSubject<boolean>(false);
    loading$ = this.loadingSubject.asObservable();

    // BehaviorSubject para la empresa actualmente seleccionada
    private selectedEmpresaSubject = new BehaviorSubject<EmpresaInfo | null>(null);
    selectedEmpresa$ = this.selectedEmpresaSubject.asObservable();

    // BehaviorSubject para el estado de inicialización
    private initializationSubject = new BehaviorSubject<boolean>(false);
    isInitialized$ = this.initializationSubject.asObservable();

    // Observable para obtener el empresaId de forma reactiva
    empresaId$ = this.selectedEmpresa$.pipe(
        map(empresa => empresa?.id || null)
    );

    // Timer para refrescar tokens automáticamente
    private refreshTimer?: ReturnType<typeof setInterval>;    // Flag para evitar múltiples llamadas simultáneas de refresh
    private isRefreshing = false;

    // Contador de intentos de reintento para refresh
    private retryCount = 0;

    // Flag para rastrear si ya se mostró la advertencia de sesión
    private sessionWarningShown = false;
    
    /**
     * Al inicializar el servicio, intentamos recuperar la sesión del usuario
     * desde el localStorage si existe
     */
    constructor() {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            // this.checkStoredSession(); // We'll call this via APP_INITIALIZER
        }
    }    
    
    /**
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
    }    /**
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
            const storedRefreshToken = localStorage.getItem(TOKEN_STORAGE.REFRESH_TOKEN);
            const storedEmpresa = localStorage.getItem(TOKEN_STORAGE.SELECTED_EMPRESA);            if (storedUser && (storedToken || storedRefreshToken)) {
                try {
                    // Verificar si el refresh token ha expirado (manejo exclusivo por refresh token)
                    if (this.isRefreshTokenExpired()) {
                        this.clearSession();
                        resolve();
                        return;
                    }

                    // Si no hay access token pero hay refresh token válido, intentar refrescar
                    if (!storedToken && storedRefreshToken && !this.isRefreshTokenExpired()) {
                        this.refreshToken().subscribe({
                            next: () => {
                                this.restoreSession(storedUser, storedEmpresa);
                                resolve();
                            },
                            error: () => {
                                this.clearSession();
                                resolve();
                            }
                        });
                        return;
                    }

                    // Validar el token antes de restaurar la sesión
                    /*if (storedToken) {
                        this.validateStoredToken(storedToken).subscribe({
                            next: (isValid) => {
                                if (isValid) {
                                    this.restoreSession(storedUser, storedEmpresa);
                                } else {
                                    this.clearSession();
                                }
                                resolve();
                            },
                            error: () => {
                                this.clearSession();
                                resolve();
                            }
                        });
                    } else {
                        this.clearSession();
                        resolve();
                    }*/
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
     * Restaura la sesión del usuario
     */
    private restoreSession(storedUser: string, storedEmpresa: string | null): void {
        const userSession: UserSession = JSON.parse(storedUser);
        const currentToken = localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN);
        if (currentToken) {
            userSession.token = currentToken;
        }
        this.userSessionSubject.next(userSession);

        // También restaurar la empresa seleccionada si existe
        if (storedEmpresa) {
            const empresaInfo: EmpresaInfo = JSON.parse(storedEmpresa);
            this.selectedEmpresaSubject.next(empresaInfo);
        }

        // Actualizar estado del TokenManager
        this.updateTokenManagerStatus();

        // Iniciar el timer de renovación automática de tokens
        this.startTokenRefreshTimer();
    }
    
    /**
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
    }    /**
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
        }, response.refreshToken); // Pasar el refresh token

        // Establecer la empresa seleccionada
        this.setSelectedEmpresa(empresa);

        this.notificationService.success(`Bienvenido a ${empresa.nombre}, ${response.name}`);
        this.router.navigate(['/dashboard']);
    }    /**
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
        }, response.refreshToken); // Pasar el refresh token

        this.notificationService.success(`Bienvenido, ${response.name}`);
        this.router.navigate(['/dashboard']);
    }/**
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
                    const userData = JSON.parse(storedUser);                    // Actualizamos la sesión con el nuevo token y la empresa seleccionada
                    this.setUserSession({
                        ...userData,
                        token: response.token,
                        empresaId
                    }, response.refreshToken); // Pasar el refresh token

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
    }    /**
     * Refresca el token usando el refresh token
     */
    refreshToken(): Observable<AuthResponse> {
        const refreshToken = localStorage.getItem(TOKEN_STORAGE.REFRESH_TOKEN);

        if (!refreshToken) {
            console.log('No refresh token available');
            return throwError(() => new Error('No refresh token'));
        }

        // Verificar si el refresh token ha expirado (24 horas)
        if (this.isRefreshTokenExpired()) {
            console.log('Refresh token expired, redirecting to login');
            this.logout();
            return throwError(() => new Error('Refresh token expired'));
        }

        const headers = new HttpHeaders({
            'Authorization': `Bearer ${refreshToken}`
        });

        return this.http.post<AuthResponse>(
            AUTH_API.REFRESH_TOKEN,
            null,
            {
                headers,
                showErrorNotification: false
            }
        ).pipe(
            tap(response => {
                // Actualizar ambos tokens
                localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, response.token);
                if (response.refreshToken) {
                    localStorage.setItem(TOKEN_STORAGE.REFRESH_TOKEN, response.refreshToken);
                    this.setRefreshTokenExpiry();
                }
                
                // Actualizar el timestamp de expiración del access token
                this.setTokenExpiry();
                // Actualizar estado del TokenManager
                this.updateTokenManagerStatus();

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
                console.error('Error refreshing token:', error);
                // Si falla el refresh token, cerrar sesión
                if (error.status === 401 || error.status === 403) {
                    this.logout();
                }
                throw error;
            })
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
    }    /**
     * Establece la información de sesión del usuario
     */
    private setUserSession(session: UserSession, refreshToken?: string): void {
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
            }));            // Guardar refresh token si se proporciona
            if (refreshToken) {
                localStorage.setItem(TOKEN_STORAGE.REFRESH_TOKEN, refreshToken);
                this.setRefreshTokenExpiry();
            }

            // Establecer el expiry del token
            this.setTokenExpiry();

            // Actualizar estado del TokenManager
            this.updateTokenManagerStatus();

            // Actualizamos el BehaviorSubject
            this.userSessionSubject.next(session);

            // Iniciar el timer de refresco de tokens
            this.startTokenRefreshTimer();
        }
    }    /**
     * Establece el timestamp de expiración del token
     */
    private setTokenExpiry(): void {
        if (isPlatformBrowser(this.platformId)) {
            const expiry = Date.now() + SESSION_CONFIG.TOKEN_LIFETIME;
            localStorage.setItem(TOKEN_STORAGE.TOKEN_EXPIRY, expiry.toString());
        }
    }

    /**
     * Establece el timestamp de expiración del refresh token
     */
    private setRefreshTokenExpiry(): void {
        if (isPlatformBrowser(this.platformId)) {
            const expiry = Date.now() + SESSION_CONFIG.SESSION_LIFETIME; // 24 horas
            localStorage.setItem(TOKEN_STORAGE.REFRESH_TOKEN_EXPIRY, expiry.toString());
        }
    }

    /**
     * Verifica si el refresh token ha expirado
     */
    private isRefreshTokenExpired(): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;
        
        const refreshTokenExpiry = localStorage.getItem(TOKEN_STORAGE.REFRESH_TOKEN_EXPIRY);
        if (!refreshTokenExpiry) return true;
        
        return Date.now() > parseInt(refreshTokenExpiry);
    }    /**
     * Actualiza el estado del TokenManager con información actual
     */
    private updateTokenManagerStatus(): void {
        if (!isPlatformBrowser(this.platformId)) return;

        const refreshTokenExpiry = localStorage.getItem(TOKEN_STORAGE.REFRESH_TOKEN_EXPIRY);
        const tokenExpiry = localStorage.getItem(TOKEN_STORAGE.TOKEN_EXPIRY);
        
        // Calcular tiempo restante de sesión basado en refresh token expiry
        if (refreshTokenExpiry) {
            const sessionTimeRemaining = Math.max(0, parseInt(refreshTokenExpiry) - Date.now());
            this.tokenManager.updateSessionTimeRemaining(sessionTimeRemaining);
        }

        // Configurar próximo refresh basado en access token expiry
        if (tokenExpiry) {
            const nextRefreshTime = new Date(parseInt(tokenExpiry) - SESSION_CONFIG.REFRESH_THRESHOLD);
            this.tokenManager.setNextRefresh(nextRefreshTime);
        }
    }    /**
     * Verifica si el token está próximo a expirar
     */
    private shouldRefreshToken(): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;
        
        const tokenExpiry = localStorage.getItem(TOKEN_STORAGE.TOKEN_EXPIRY);
        if (!tokenExpiry) return true;
        
        const timeUntilExpiry = parseInt(tokenExpiry) - Date.now();
        return timeUntilExpiry <= SESSION_CONFIG.REFRESH_THRESHOLD;
    }    /**
     * Inicia el timer automático para refrescar tokens
     */    private startTokenRefreshTimer(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        // Actualizar estado inicial del TokenManager
        this.updateTokenManagerStatus();        this.refreshTimer = setInterval(() => {
            // Verificar si el refresh token ha expirado
            if (this.isRefreshTokenExpired()) {
                this.handleSessionExpired();
                return;
            }

            // Actualizar el estado del TokenManager periódicamente
            this.updateTokenManagerStatus();
            
            // Verificar alertas de sesión con diferentes umbrales
            const currentStatus = this.tokenManager.getCurrentStatus();
            const sessionTimeRemaining = currentStatus.sessionTimeRemaining;
            
            // Sistema de alertas escalonadas
            this.checkSessionWarnings(sessionTimeRemaining);

            if (this.shouldRefreshToken() && !this.isRefreshing) {
                this.performTokenRefresh();
            }
        }, SESSION_CONFIG.REFRESH_INTERVAL);
    }

    /**
     * Detiene el timer de refresco de tokens
     */
    private stopTokenRefreshTimer(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }
    }

    /**
     * Maneja la expiración de la sesión de 24 horas
     */
    private handleSessionExpired(): void {
        this.notificationService.info('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        this.logout();
    }    /**
     * Realiza el refresh del token de forma controlada con retry logic
     */
    private performTokenRefresh(): void {
        if (this.isRefreshing) return;
        
        this.isRefreshing = true;
        this.tokenManager.setRefreshing(true);
        
        this.refreshTokenWithRetry().subscribe({
            next: (response: AuthResponse) => {
                if (response.token) {
                    this.setTokenExpiry();
                    this.updateTokenManagerStatus();
                    this.retryCount = 0; // Reset retry count on success
                    console.log('Token renovado automáticamente');
                    
                    // Notificación proactiva de renovación exitosa
                    this.notificationService.tokenRefreshed();
                }
                this.isRefreshing = false;
                this.tokenManager.setRefreshing(false);
            },
            error: (error: any) => {
                console.error('Error al renovar token automáticamente:', error);
                this.isRefreshing = false;
                this.tokenManager.setRefreshing(false);
                this.retryCount = 0; // Reset retry count
                
                // Notificación de error en renovación
                this.notificationService.error('Error al renovar sesión automáticamente');
                
                if (error.status === 401 || error.status === 403) {
                    this.handleSessionExpired();
                }
            }
        });
    }

    /**
     * Refresca el token con lógica de reintento
     */
    private refreshTokenWithRetry(): Observable<AuthResponse> {
        return this.refreshToken().pipe(
            catchError((error) => {
                if (this.retryCount < SESSION_CONFIG.RETRY_ATTEMPTS && this.shouldRetry(error)) {
                    this.retryCount++;
                    console.log(`Reintentando refresh token (${this.retryCount}/${SESSION_CONFIG.RETRY_ATTEMPTS})`);
                    
                    return timer(SESSION_CONFIG.RETRY_DELAY).pipe(
                        tap(() => this.notificationService.info(`Reintentando conectar... (${this.retryCount}/${SESSION_CONFIG.RETRY_ATTEMPTS})`)),
                        switchMap(() => this.refreshTokenWithRetry())
                    );
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * Determina si un error es recuperable para reintento
     */
    private shouldRetry(error: any): boolean {
        // Reintentar solo en casos de problemas de red o errores temporales del servidor
        return error.status === 0 || // Error de red
               error.status === 408 || // Request Timeout
               error.status === 429 || // Too Many Requests
               (error.status >= 500 && error.status < 600); // Server errors
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
    }    /**
     * Cierra la sesión del usuario
     */
    logout(): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            this.clearSession();
        }
        // Detener el timer de renovación
        this.stopTokenRefreshTimer();
        // Resetear el estado del TokenManager
        this.tokenManager.reset();
        this.router.navigate(['/auth/login']);
    }    /**
     * Limpia los datos de sesión del localStorage
     */
    private clearSession(): void {
        if (isPlatformBrowser(this.platformId)) { // Check if in browser
            localStorage.removeItem(TOKEN_STORAGE.AUTH_TOKEN);
            localStorage.removeItem(TOKEN_STORAGE.REFRESH_TOKEN);
            localStorage.removeItem(TOKEN_STORAGE.REFRESH_TOKEN_EXPIRY);
            localStorage.removeItem(TOKEN_STORAGE.SESSION_TOKEN);
            localStorage.removeItem(TOKEN_STORAGE.USER_DATA);
            localStorage.removeItem(TOKEN_STORAGE.SELECTED_EMPRESA);
            localStorage.removeItem(TOKEN_STORAGE.EMPRESAS_LIST);
            localStorage.removeItem(TOKEN_STORAGE.TOKEN_EXPIRY);
            // Limpiar banderas de advertencias
            this.clearWarningFlags();
        }
        this.userSessionSubject.next(null);
        this.selectedEmpresaSubject.next(null);
    }

    /**
     * Verifica y maneja las alertas de sesión según diferentes umbrales
     */
    private checkSessionWarnings(sessionTimeRemaining: number): void {
        if (sessionTimeRemaining <= 0) return;
        
        const minutes = Math.floor(sessionTimeRemaining / (60 * 1000));
        
        // Alerta crítica - 5 minutos
        if (sessionTimeRemaining <= SESSION_CONFIG.WARNING_THRESHOLDS.CRITICAL && 
            sessionTimeRemaining > SESSION_CONFIG.WARNING_THRESHOLDS.CRITICAL - 60000 && 
            !this.hasShownWarning('critical')) {
            this.notificationService.error(
                `🚨 ATENCIÓN: Su sesión expirará en ${minutes} minutos. Guarde su trabajo.`
            );
            this.setWarningShown('critical');
        }
        // Alerta de advertencia - 15 minutos
        else if (sessionTimeRemaining <= SESSION_CONFIG.WARNING_THRESHOLDS.WARNING && 
                 sessionTimeRemaining > SESSION_CONFIG.WARNING_THRESHOLDS.WARNING - 60000 && 
                 !this.hasShownWarning('warning')) {
            this.notificationService.sessionExpiringSoon(minutes);
            this.setWarningShown('warning');
        }
        // Alerta informativa - 30 minutos
        else if (sessionTimeRemaining <= SESSION_CONFIG.WARNING_THRESHOLDS.INFO && 
                 sessionTimeRemaining > SESSION_CONFIG.WARNING_THRESHOLDS.INFO - 60000 && 
                 !this.hasShownWarning('info')) {
            this.notificationService.info(
                `ℹ️ Su sesión estará activa por ${minutes} minutos más.`
            );
            this.setWarningShown('info');
        }
    }    /**
     * Verifica si ya se mostró una advertencia específica
     */
    private hasShownWarning(type: 'critical' | 'warning' | 'info'): boolean {
        if (!isPlatformBrowser(this.platformId)) return false;
        
        const key = `tms_warning_${type}_shown`;
        const refreshTokenExpiry = localStorage.getItem(TOKEN_STORAGE.REFRESH_TOKEN_EXPIRY);
        const warningTimestamp = localStorage.getItem(key);
        
        if (!warningTimestamp || !refreshTokenExpiry) return false;
        
        // Verificar si la advertencia fue mostrada en esta sesión actual
        // (usando refresh token expiry como referencia de sesión)
        const sessionStartTime = parseInt(refreshTokenExpiry) - SESSION_CONFIG.SESSION_LIFETIME;
        return parseInt(warningTimestamp) > sessionStartTime;
    }

    /**
     * Marca una advertencia como mostrada
     */
    private setWarningShown(type: 'critical' | 'warning' | 'info'): void {
        if (!isPlatformBrowser(this.platformId)) return;
        
        const key = `tms_warning_${type}_shown`;
        localStorage.setItem(key, Date.now().toString());
    }

    /**
     * Limpia las marcas de advertencias mostradas
     */
    private clearWarningFlags(): void {
        if (!isPlatformBrowser(this.platformId)) return;
        
        localStorage.removeItem('tms_warning_critical_shown');
        localStorage.removeItem('tms_warning_warning_shown');
        localStorage.removeItem('tms_warning_info_shown');
    }
}