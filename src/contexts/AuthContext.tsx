import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '../services/loginService';
import type { LoginRequest, LoginResponse } from '../services/loginService';
import { AuthContext, type User } from './AuthContextTypes';
import api from '../services/api';

// Función helper para decodificar el JWT y extraer información básica del usuario
const decodeToken = (token: string): { userId: string; email: string } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const decoded = JSON.parse(jsonPayload);

    // Verifica si el token no ha expirado
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return null; // Token expirado
    }

    // Solo retornamos los datos que sabemos que están en el token
    return {
      userId: decoded.userId,
      email: decoded.sub, // El 'sub' generalmente contiene el email
    };
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Función helper para obtener todos los datos del usuario desde el backend
interface BusinessMembership {
  businessId?: string;
  businessName?: string;
  role?: string;
  status?: string;
}

const selectPrimaryBusiness = (payload: unknown): BusinessMembership | null => {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as { [key: string]: unknown };

  if (Array.isArray(data.businesses) && data.businesses.length > 0) {
    return (data.businesses as BusinessMembership[]).find(Boolean) ?? null;
  }

  if (Array.isArray(data.businessMemberships) && data.businessMemberships.length > 0) {
    return (data.businessMemberships as BusinessMembership[]).find(Boolean) ?? null;
  }

  if (data.business && typeof data.business === 'object') {
    return data.business as BusinessMembership;
  }

  return null;
};

const fetchCompleteUserData = async (authToken: string): Promise<User | null> => {
  try {
    const response = await api.get('/users/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data) {
      const basicData = decodeToken(authToken);
      if (!basicData) return null;

      const businessData = selectPrimaryBusiness(response.data);

      const businessId = businessData?.businessId ?? response.data.businessId ?? '';
      const businessName = businessData?.businessName ?? response.data.businessName ?? '';
      const role = businessData?.role ?? response.data.role ?? 'EMPLOYEE';
      const status = businessData?.status ?? response.data.status ?? 'PENDING';

      return {
        userId: basicData.userId,
        email: basicData.email,
        name: response.data.name,
        lastName: response.data.lastName,
        businessId,
        businessName,
        role,
        status
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching complete user data:', error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Computed directly to avoid race conditions on page reload
  // Previously this was a separate state updated via useEffect, which caused
  // a 1-render delay where isAuthenticated was false while user/token were set
  const isAuthenticated = !!user && !!token;

  // Verificar token al cargar la app y obtener datos completos del usuario
  useEffect(() => {
    const storedToken = AuthService.getToken();
    const init = async () => {
      setIsLoading(true);
      try {
        if (storedToken) {
          const basicUserData = decodeToken(storedToken);
          if (basicUserData) {
            setToken(storedToken);

            // Obtener datos completos del usuario desde el backend
            const completeUserData = await fetchCompleteUserData(storedToken);
            if (completeUserData) {
              setUser(completeUserData);
            } else {
              // Si no se pueden obtener los datos completos, limpiar todo
              AuthService.logout();
            }
          } else {
            // Token inválido o expirado
            AuthService.logout();
          }
        }
      } finally {
        setIsLoading(false);
        setIsBootstrapping(false);
      }
    };
    init();
  }, []);

  const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
    setIsLoading(true);
    try {
      const response = await AuthService.login(credentials);

      if (response.token) {
        const basicUserData = decodeToken(response.token);
        if (basicUserData) {
          setToken(response.token);

          // Obtener datos completos del usuario antes de marcar como autenticado
          const completeUserData = await fetchCompleteUserData(response.token);
          if (completeUserData) {
            setUser(completeUserData);
            console.log('Complete user data loaded:', completeUserData);
          } else {
            // Si no se pueden obtener los datos completos, fallar el login
            throw new Error('No se pudieron cargar los datos completos del usuario');
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      // Limpiar estado en caso de error
      setToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...userData } : null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isBootstrapping,
        isAuthenticated,
        login,
        logout,
        updateUser,
        token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
