import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { authApi } from '../api/endpoints';
import { BASE_URL, authEvents } from '../api/client';

WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]                 = useState(null);
  const [loading, setLoading]           = useState(true);
  const [authError, setAuthError]       = useState(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);

  // ─── Bootstrap: load stored session ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedUser, accessToken, refreshToken] = await AsyncStorage.multiGet([
          'user', 'accessToken', 'refreshToken',
        ]);
        if (storedUser[1] && accessToken[1] && refreshToken[1]) {
          setUser(JSON.parse(storedUser[1]));
        } else {
          // Clear stale/incomplete session
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        }
      } catch (e) {
        console.warn('[AuthContext] bootstrap error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Force logout when interceptor detects missing/invalid tokens ────────
  useEffect(() => {
    const handler = () => setUser(null);
    authEvents.on('logout', handler);
    return () => authEvents.off('logout', handler);
  }, []);

  // ─── Email / Password login ────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    setAuthError(null);
    setUnverifiedEmail(null);
    try {
      const res = await authApi.signIn(email, password);
      // Backend trả về: { success, data: { ...user, accessToken } }
      const responseData = res.data?.data || res.data;
      const { accessToken, refreshToken, ...userData } = responseData;
      await AsyncStorage.multiSet([
        ['accessToken', accessToken],
        ['refreshToken', refreshToken ?? ''],
        ['user', JSON.stringify(userData)],
      ]);
      setUser(userData);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại';
      setAuthError(msg);
      // Backend trả 403 khi tài khoản local chưa xác nhận email
      if (err.response?.status === 403) {
        setUnverifiedEmail(email);
      }
      return { success: false, message: msg };
    }
  }, []);

  // ─── Resend verification email ──────────────────────────────────────────
  const resendVerification = useCallback(async (email) => {
    try {
      await authApi.resendVerification(email);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Gửi lại email xác nhận thất bại';
      return { success: false, message: msg };
    }
  }, []);

  // ─── Google OAuth login (via backend redirect) ─────────────────────────
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      // Create a dynamic redirect URI that works in Expo Go, Dev Client, and Production
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'sealhackathon',
        path: 'oauth'
      });
      
      // Open the backend Google OAuth endpoint in a browser
      const authUrl = `${BASE_URL}/api/auth/google?mobile=true&redirectUri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(
        authUrl,
        redirectUri
      );
      if (result.type === 'success' && result.url) {
        // Parse tokens from redirect URL query params
        const url = new URL(result.url);
        const accessToken  = url.searchParams.get('accessToken');
        const refreshToken = url.searchParams.get('refreshToken');
        if (!accessToken) throw new Error('Không nhận được token từ Google');
        // Fetch user info with the new token
        const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const meData = await meRes.json();
        const userData = meData.data || meData.user;
        await AsyncStorage.multiSet([
          ['accessToken', accessToken],
          ['refreshToken', refreshToken ?? ''],
          ['user', JSON.stringify(userData)],
        ]);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: 'Google login bị hủy' };
    } catch (err) {
      const msg = err.message || 'Google login thất bại';
      setAuthError(msg);
      return { success: false, message: msg };
    }
  }, []);

  // ─── Logout ─────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try { await authApi.signOut(); } catch (_) {}
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
    setUser(null);
  }, []);

  // ─── Refresh user data ───────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      const userData = res.data.data || res.data.user;
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (_) {}
  }, []);

  // ─── Role helpers ────────────────────────────────────────────────────────
  const hasRole = useCallback((role) => {
    return user?.roles?.some((r) => r.role_name === role) ?? false;
  }, [user]);

  const primaryRole = user?.roles?.[0]?.role_name ?? null;

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      authError,
      unverifiedEmail,
      signIn,
      signInWithGoogle,
      signOut,
      refreshUser,
      resendVerification,
      hasRole,
      primaryRole,
      isStudent: hasRole('contestant'),
      isMentor:  hasRole('mentor'),
      isAdmin:   hasRole('admin'),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
