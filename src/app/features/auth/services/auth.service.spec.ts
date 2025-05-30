import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Subject, BehaviorSubject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';

import { AuthService } from './auth.service';
import { HttpService } from '../../../core/services/http.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TokenManagerService } from '../../../core/services/token-manager.service';
import {
  LoginRequest,
  LoginResponse,
  AuthResponse,
  UserSession,
  EmpresaInfo,
  RegisterRequest,
  UserResponse
} from '../models/auth.model';
import { AUTH_API, TOKEN_STORAGE, SESSION_CONFIG } from '../constants/auth.constants';

// Mock data
const mockUser: UserSession = {
  userId: 1,
  userName: 'testuser',
  role: 'admin',
  token: 'mock-token',
  empresaId: 1,
  name: 'Test',
  lastName: 'User'
};

const mockEmpresa: EmpresaInfo = {
  id: 1,
  nombre: 'Test Company',
  email: 'test@company.com'
};

const mockLoginRequest: LoginRequest = {
  userName: 'testuser',
  password: 'password123'
};

const mockSingleEmpresaResponse: LoginResponse = {
  userId: 1,
  userName: 'testuser',
  role: 'admin',
  empresas: [mockEmpresa],
  token: 'valid-token',
  sessionToken: '',
  name: 'Test',
  lastName: 'User'
};

const mockMultipleEmpresasResponse: LoginResponse = {
  userId: 1,
  userName: 'testuser',
  role: 'admin',
  empresas: [mockEmpresa, { id: 2, nombre: 'Company 2', email: 'test2@company.com' }],
  token: '',
  sessionToken: 'session-token',
  name: 'Test',
  lastName: 'User'
};

const mockAuthResponse: AuthResponse = {
  token: 'new-token'
};

describe('AuthService', () => {
  let service: AuthService;
  let httpServiceSpy: jasmine.SpyObj<HttpService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let tokenManagerSpy: jasmine.SpyObj<TokenManagerService>;

  beforeEach(() => {
    // Create spies
    const httpSpy = jasmine.createSpyObj('HttpService', ['post', 'get', 'buildParams']);
    const routerSpyObj = jasmine.createSpyObj('Router', ['navigate']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', [
      'success', 'error', 'info', 'warning', 'tokenRefreshed', 'sessionExpiringSoon'
    ]);
    const tokenManagerSpyObj = jasmine.createSpyObj('TokenManagerService', [
      'setRefreshing', 'reset', 'updateSessionTimeRemaining', 'setNextRefresh', 'getCurrentStatus'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: httpSpy },
        { provide: Router, useValue: routerSpyObj },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: TokenManagerService, useValue: tokenManagerSpyObj },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(AuthService);
    httpServiceSpy = TestBed.inject(HttpService) as jasmine.SpyObj<HttpService>;
    routerSpy = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    tokenManagerSpy = TestBed.inject(TokenManagerService) as jasmine.SpyObj<TokenManagerService>;

    // Setup default spy returns
    tokenManagerSpy.getCurrentStatus.and.returnValue({
      isRefreshing: false,
      sessionTimeRemaining: 3600000, // 1 hour
      nextRefresh: new Date(),
      lastRefresh: new Date()
    });

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null user session', (done) => {
      service.userSession$.subscribe(session => {
        expect(session).toBeNull();
        done();
      });
    });

    it('should initialize with loading false', (done) => {
      service.loading$.subscribe(loading => {
        expect(loading).toBeFalse();
        done();
      });
    });
  });

  describe('Authentication Flow', () => {
    describe('login()', () => {
      it('should handle single empresa login successfully', () => {
        httpServiceSpy.post.and.returnValue(of(mockSingleEmpresaResponse));

        service.login(mockLoginRequest).subscribe(response => {
          expect(response).toEqual(mockSingleEmpresaResponse);
          expect(httpServiceSpy.post).toHaveBeenCalledWith(
            AUTH_API.LOGIN,
            mockLoginRequest,
            { showErrorNotification: false }
          );
          expect(notificationServiceSpy.success).toHaveBeenCalledWith(
            `Bienvenido a ${mockEmpresa.nombre}, Test`
          );
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
        });
      });

      it('should handle multiple empresas login scenario', () => {
        httpServiceSpy.post.and.returnValue(of(mockMultipleEmpresasResponse));

        service.login(mockLoginRequest).subscribe(response => {
          expect(response).toEqual(mockMultipleEmpresasResponse);
          expect(localStorage.getItem(TOKEN_STORAGE.SESSION_TOKEN)).toBe('session-token');
          expect(localStorage.getItem(TOKEN_STORAGE.EMPRESAS_LIST)).toBe(
            JSON.stringify(mockMultipleEmpresasResponse.empresas)
          );
          expect(notificationServiceSpy.success).toHaveBeenCalledWith(
            'Bienvenido, Test. Por favor seleccione una empresa.'
          );
        });
      });

      it('should handle login errors', () => {
        const error = { status: 401, message: 'Unauthorized' };
        httpServiceSpy.post.and.returnValue(throwError(() => error));

        service.login(mockLoginRequest).subscribe({
          next: () => fail('Should have failed'),
          error: (err) => {
            expect(err).toEqual(error);
          }
        });
      });
    });

    describe('generateToken()', () => {
      beforeEach(() => {
        // Setup user data in localStorage for generateToken tests
        localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify({
          userId: 1,
          userName: 'testuser',
          role: 'admin',
          name: 'Test',
          lastName: 'User'
        }));
        httpServiceSpy.buildParams.and.returnValue({} as any);
      });

      it('should generate token successfully', () => {
        httpServiceSpy.post.and.returnValue(of(mockAuthResponse));

        service.generateToken(1, 1, 'session-token').subscribe(response => {
          expect(response).toEqual(mockAuthResponse);
          expect(httpServiceSpy.post).toHaveBeenCalledWith(
            AUTH_API.GENERATE_TOKEN,
            null,
            {
              params: {},
              showErrorNotification: true
            }
          );
          expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
        });
      });

      it('should handle missing session token', () => {
        service.generateToken(1, 1, '').subscribe({
          next: () => fail('Should have failed'),
          error: (err) => {
            expect(err.message).toBe('Session token required');
            expect(notificationServiceSpy.error).toHaveBeenCalledWith(
              'Error: Token de sesión requerido para generar token de empresa.'
            );
          }
        });
      });
    });
  });

  describe('Token Management', () => {
    describe('refreshToken()', () => {
      beforeEach(() => {
        localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'current-token');
      });

      it('should refresh token successfully', () => {
        httpServiceSpy.post.and.returnValue(of(mockAuthResponse));
        spyOn(service as any, 'setTokenExpiry');
        spyOn(service as any, 'updateTokenManagerStatus');

        service.refreshToken().subscribe(response => {
          expect(response).toEqual(mockAuthResponse);
          expect(localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN)).toBe('new-token');
          expect((service as any).setTokenExpiry).toHaveBeenCalled();
          expect((service as any).updateTokenManagerStatus).toHaveBeenCalled();
        });
      });

      it('should handle refresh token error', () => {
        const error = { status: 401 };
        httpServiceSpy.post.and.returnValue(throwError(() => error));
        spyOn(service, 'logout');

        service.refreshToken().subscribe({
          next: () => fail('Should have failed'),
          error: (err) => {
            expect(err).toEqual(error);
            expect(service.logout).toHaveBeenCalled();
          }
        });
      });

      it('should return empty token when no stored token', () => {
        localStorage.removeItem(TOKEN_STORAGE.AUTH_TOKEN);

        service.refreshToken().subscribe(response => {
          expect(response.token).toBe('');
        });
      });
    });

    describe('Retry Logic', () => {
      beforeEach(() => {
        localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'current-token');
        jasmine.clock().install();
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('should retry refresh token on network errors', () => {
        let callCount = 0;
        httpServiceSpy.post.and.callFake(() => {
          callCount++;
          if (callCount <= 2) {
            return throwError(() => ({ status: 0 })); // Network error
          }
          return of(mockAuthResponse);
        });

        spyOn(service as any, 'refreshTokenWithRetry').and.callThrough();
        
        (service as any).performTokenRefresh();
        
        jasmine.clock().tick(SESSION_CONFIG.RETRY_DELAY * 3);
        
        expect(callCount).toBeGreaterThan(1);
        expect(notificationServiceSpy.info).toHaveBeenCalledWith(
          jasmine.stringMatching(/Reintentando conectar/)
        );
      });

      it('should not retry on 401 unauthorized errors', () => {
        httpServiceSpy.post.and.returnValue(throwError(() => ({ status: 401 })));
        spyOn(service as any, 'shouldRetry').and.callThrough();

        (service as any).refreshTokenWithRetry().subscribe({
          error: () => {
            expect((service as any).shouldRetry({ status: 401 })).toBeFalse();
          }
        });
      });

      it('should retry on server errors (5xx)', () => {
        spyOn(service as any, 'shouldRetry').and.callThrough();
        
        expect((service as any).shouldRetry({ status: 500 })).toBeTrue();
        expect((service as any).shouldRetry({ status: 503 })).toBeTrue();
        expect((service as any).shouldRetry({ status: 408 })).toBeTrue(); // Timeout
      });
    });
  });

  describe('Session Management', () => {
    describe('Session Expiry Warnings', () => {
      beforeEach(() => {
        jasmine.clock().install();
        localStorage.setItem(TOKEN_STORAGE.LOGIN_TIMESTAMP, Date.now().toString());
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      it('should show critical warning at 5 minutes remaining', () => {
        spyOn(service as any, 'hasShownWarning').and.returnValue(false);
        spyOn(service as any, 'setWarningShown');
        
        const fiveMinutes = 5 * 60 * 1000;
        (service as any).checkSessionWarnings(fiveMinutes);
        
        expect(notificationServiceSpy.error).toHaveBeenCalledWith(
          jasmine.stringMatching(/🚨 ATENCIÓN: Su sesión expirará en 5 minutos/)
        );
        expect((service as any).setWarningShown).toHaveBeenCalledWith('critical');
      });

      it('should show warning at 15 minutes remaining', () => {
        spyOn(service as any, 'hasShownWarning').and.returnValue(false);
        spyOn(service as any, 'setWarningShown');
        
        const fifteenMinutes = 15 * 60 * 1000;
        (service as any).checkSessionWarnings(fifteenMinutes);
        
        expect(notificationServiceSpy.sessionExpiringSoon).toHaveBeenCalledWith(15);
        expect((service as any).setWarningShown).toHaveBeenCalledWith('warning');
      });

      it('should show info at 30 minutes remaining', () => {
        spyOn(service as any, 'hasShownWarning').and.returnValue(false);
        spyOn(service as any, 'setWarningShown');
        
        const thirtyMinutes = 30 * 60 * 1000;
        (service as any).checkSessionWarnings(thirtyMinutes);
        
        expect(notificationServiceSpy.info).toHaveBeenCalledWith(
          jasmine.stringMatching(/ℹ️ Su sesión estará activa por 30 minutos más/)
        );
        expect((service as any).setWarningShown).toHaveBeenCalledWith('info');
      });

      it('should not show duplicate warnings in same session', () => {
        spyOn(service as any, 'hasShownWarning').and.returnValue(true);
        
        const fiveMinutes = 5 * 60 * 1000;
        (service as any).checkSessionWarnings(fiveMinutes);
        
        expect(notificationServiceSpy.error).not.toHaveBeenCalled();
      });
    });

    describe('Session Expiry Detection', () => {
      it('should detect expired session', () => {
        const pastTimestamp = Date.now() - (SESSION_CONFIG.SESSION_LIFETIME + 1000);
        localStorage.setItem(TOKEN_STORAGE.LOGIN_TIMESTAMP, pastTimestamp.toString());
        
        expect((service as any).isSessionExpired()).toBeTrue();
      });

      it('should detect valid session', () => {
        const recentTimestamp = Date.now() - 1000; // 1 second ago
        localStorage.setItem(TOKEN_STORAGE.LOGIN_TIMESTAMP, recentTimestamp.toString());
        
        expect((service as any).isSessionExpired()).toBeFalse();
      });

      it('should return true when no login timestamp', () => {
        localStorage.removeItem(TOKEN_STORAGE.LOGIN_TIMESTAMP);
        
        expect((service as any).isSessionExpired()).toBeTrue();
      });
    });
  });

  describe('Token Validation', () => {
    describe('validateToken()', () => {
      it('should validate token successfully', () => {
        localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'valid-token');
        httpServiceSpy.get.and.returnValue(of(true));

        service.validateToken().subscribe(result => {
          expect(result).toBeTrue();
          expect(httpServiceSpy.get).toHaveBeenCalledWith(
            AUTH_API.VALIDATE_TOKEN,
            {
              headers: jasmine.any(Object),
              showErrorNotification: false
            }
          );
        });
      });

      it('should return false for invalid token', () => {
        localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'invalid-token');
        httpServiceSpy.get.and.returnValue(throwError(() => new Error('Invalid token')));

        service.validateToken().subscribe(result => {
          expect(result).toBeFalse();
        });
      });

      it('should return false when no token stored', () => {
        localStorage.removeItem(TOKEN_STORAGE.AUTH_TOKEN);

        service.validateToken().subscribe(result => {
          expect(result).toBeFalse();
        });
      });
    });
  });

  describe('Company Management', () => {
    it('should select empresa correctly', () => {
      service.selectEmpresa(mockEmpresa);
      
      expect(localStorage.getItem(TOKEN_STORAGE.SELECTED_EMPRESA)).toBe(
        JSON.stringify(mockEmpresa)
      );
      
      service.selectedEmpresa$.subscribe(empresa => {
        expect(empresa).toEqual(mockEmpresa);
      });
    });

    it('should get current empresa ID', () => {
      service.selectEmpresa(mockEmpresa);
      
      expect(service.getCurrentEmpresaId()).toBe(1);
    });

    it('should return null when no empresa selected', () => {
      expect(service.getCurrentEmpresaId()).toBeNull();
    });

    it('should check if empresa is selected', () => {
      expect(service.hasSelectedEmpresa()).toBeFalse();
      
      service.selectEmpresa(mockEmpresa);
      
      expect(service.hasSelectedEmpresa()).toBeTrue();
    });
  });

  describe('User Registration', () => {
    it('should register user successfully', () => {
      const registerData: RegisterRequest = {
        userName: 'newuser',
        password: 'password123',
        role: 'user',
        name: 'New',
        lastName: 'User',
        phoneNumber: '123456789',
        email: 'new@user.com'
      };

      const mockUserResponse: UserResponse = {
        id: 2,
        userName: 'newuser',
        role: 'user'
      };

      httpServiceSpy.post.and.returnValue(of(mockUserResponse));

      service.register(registerData).subscribe(response => {
        expect(response).toEqual(mockUserResponse);
        expect(httpServiceSpy.post).toHaveBeenCalledWith(
          AUTH_API.REGISTER,
          registerData,
          { showErrorNotification: true }
        );
        expect(notificationServiceSpy.success).toHaveBeenCalledWith(
          'Usuario registrado correctamente'
        );
      });
    });
  });

  describe('Authentication State', () => {
    it('should return authenticated state correctly', (done) => {
      // Initially not authenticated
      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBeFalse();
        
        // Set user session
        (service as any).userSessionSubject.next(mockUser);
        
        service.isAuthenticated().subscribe(isAuthAfter => {
          expect(isAuthAfter).toBeTrue();
          done();
        });
      });
    });

    it('should provide empresa ID observable', (done) => {
      service.empresaId$.subscribe(id => {
        expect(id).toBeNull();
        
        service.selectEmpresa(mockEmpresa);
        
        service.empresaId$.subscribe(newId => {
          expect(newId).toBe(1);
          done();
        });
      });
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Setup session data
      localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'token');
      localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify(mockUser));
      localStorage.setItem(TOKEN_STORAGE.SELECTED_EMPRESA, JSON.stringify(mockEmpresa));
      (service as any).userSessionSubject.next(mockUser);
      (service as any).selectedEmpresaSubject.next(mockEmpresa);
    });

    it('should clear session and redirect to login', () => {
      spyOn(service as any, 'stopTokenRefreshTimer');
      
      service.logout();
      
      expect(localStorage.getItem(TOKEN_STORAGE.AUTH_TOKEN)).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE.USER_DATA)).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE.SELECTED_EMPRESA)).toBeNull();
      expect((service as any).stopTokenRefreshTimer).toHaveBeenCalled();
      expect(tokenManagerSpy.reset).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/auth/login']);
      
      service.userSession$.subscribe(session => {
        expect(session).toBeNull();
      });
      
      service.selectedEmpresa$.subscribe(empresa => {
        expect(empresa).toBeNull();
      });
    });
  });

  describe('Session Storage Management', () => {
    it('should handle stored session validation', async () => {
      // Setup stored session
      localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'stored-token');
      localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify(mockUser));
      localStorage.setItem(TOKEN_STORAGE.SELECTED_EMPRESA, JSON.stringify(mockEmpresa));
      
      httpServiceSpy.get.and.returnValue(of(true)); // Valid token
      spyOn(service as any, 'updateTokenManagerStatus');
      spyOn(service as any, 'startTokenRefreshTimer');
      
      await (service as any).checkStoredSession();
      
      expect(httpServiceSpy.get).toHaveBeenCalled();
      expect((service as any).updateTokenManagerStatus).toHaveBeenCalled();
      expect((service as any).startTokenRefreshTimer).toHaveBeenCalled();
    });

    it('should clear invalid stored session', async () => {
      localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'invalid-token');
      localStorage.setItem(TOKEN_STORAGE.USER_DATA, JSON.stringify(mockUser));
      
      httpServiceSpy.get.and.returnValue(of(false)); // Invalid token
      spyOn(service as any, 'clearSession');
      
      await (service as any).checkStoredSession();
      
      expect((service as any).clearSession).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed stored user data', async () => {
      localStorage.setItem(TOKEN_STORAGE.AUTH_TOKEN, 'token');
      localStorage.setItem(TOKEN_STORAGE.USER_DATA, 'invalid-json');
      
      spyOn(service as any, 'clearSession');
      
      await (service as any).checkStoredSession();
      
      expect((service as any).clearSession).toHaveBeenCalled();
    });

    it('should handle browser platform detection', () => {
      expect(service.getToken()).toBe(null); // Should work in browser environment
    });

    it('should handle warning flag management correctly', () => {
      const type = 'critical';
      
      // Initially no warning shown
      expect((service as any).hasShownWarning(type)).toBeFalse();
      
      // Set warning
      (service as any).setWarningShown(type);
      localStorage.setItem(TOKEN_STORAGE.LOGIN_TIMESTAMP, (Date.now() - 1000).toString());
      
      // Should show as shown
      expect((service as any).hasShownWarning(type)).toBeTrue();
      
      // Clear warnings
      (service as any).clearWarningFlags();
      
      // Should be cleared
      expect((service as any).hasShownWarning(type)).toBeFalse();
    });
  });
});
