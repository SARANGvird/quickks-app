// src/utils/tokenManager.js - v5.0 PRODUCTION FINAL
// ✅ JWT expiry validation, Bearer clean, multi-key fallback, events

class TokenManagerClass {
  static TOKEN_KEYS = {
    ACCESS_TOKEN: 'accessToken',
    REFRESH_TOKEN: 'refreshToken',
    USER: 'user',
    USER_ID: 'userId',
    USER_ROLE: 'userRole',
    TOKEN_EXPIRY: 'tokenExpiry',
    REMEMBER_ME: 'rememberMe'
  };

  static LEGACY_KEYS = ['accessToken', 'authToken', 'token'];

  // ============ PRIVATE HELPERS ============
  _clean(token) {
    if (!token || typeof token!== 'string') return null;
    return token.replace(/^Bearer\s+/i, '').trim();
  }

  _parsePayload(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch { return null; }
  }

  _isExpired(token, bufferMs = 60000) {
    const payload = this._parsePayload(token);
    if (!payload ||!payload.exp) return false; // if no exp, treat as valid
    return payload.exp * 1000 < Date.now() + bufferMs;
  }

  _getFromStorage(key) {
    try {
      return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
    } catch { return null; }
  }

  _setToStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    } catch {}
  }

  // ============ ACCESS TOKEN ============
  getAccessToken = () => {
    try {
      for (const key of TokenManagerClass.LEGACY_KEYS) {
        let token = this._getFromStorage(key);
        token = this._clean(token);
        if (!token) continue;
        if (token.split('.').length!== 3) continue;
        if (this._isExpired(token)) continue; // skip expired
        return token;
      }
      return null;
    } catch (e) {
      console.error('TokenManager getAccessToken error:', e);
      return null;
    }
  };

  // Raw token even if expired - for refresh flow
  getRawAccessToken = () => {
    try {
      for (const key of TokenManagerClass.LEGACY_KEYS) {
        let token = this._getFromStorage(key);
        token = this._clean(token);
        if (token && token.split('.').length === 3) return token;
      }
      return null;
    } catch { return null; }
  };

  setAccessToken = (token) => {
    try {
      token = this._clean(token);
      if (!token) return this.removeAccessToken();
      TokenManagerClass.LEGACY_KEYS.forEach(k => this._setToStorage(k, token));
      localStorage.setItem(TokenManagerClass.TOKEN_KEYS.ACCESS_TOKEN, token);

      const payload = this._parsePayload(token);
      if (payload?.exp) {
        localStorage.setItem(TokenManagerClass.TOKEN_KEYS.TOKEN_EXPIRY, String(payload.exp * 1000));
      }
      window.dispatchEvent(new CustomEvent('token-refreshed'));
    } catch (e) { console.error('setAccessToken error', e); }
  };

  removeAccessToken = () => {
    try {
      [...TokenManagerClass.LEGACY_KEYS, TokenManagerClass.TOKEN_KEYS.ACCESS_TOKEN, TokenManagerClass.TOKEN_KEYS.TOKEN_EXPIRY]
       .forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
    } catch {}
  };

  // ============ REFRESH TOKEN ============
  getRefreshToken = () => {
    try { return localStorage.getItem(TokenManagerClass.TOKEN_KEYS.REFRESH_TOKEN) || null; }
    catch { return null; }
  };

  setRefreshToken = (token) => {
    try {
      if (token) localStorage.setItem(TokenManagerClass.TOKEN_KEYS.REFRESH_TOKEN, token);
      else localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.REFRESH_TOKEN);
    } catch {}
  };

  removeRefreshToken = () => {
    try { localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.REFRESH_TOKEN); } catch {}
  };

  // ============ TOKEN PAIR ============
  setTokens = (accessToken, refreshToken, user = null, expiresIn = null) => {
    if (accessToken) this.setAccessToken(accessToken);
    if (refreshToken) this.setRefreshToken(refreshToken);
    if (user) this.setUser(user);
    if (expiresIn) {
      const expiry = Date.now() + expiresIn * 1000;
      localStorage.setItem(TokenManagerClass.TOKEN_KEYS.TOKEN_EXPIRY, String(expiry));
    }
  };

  getTokens = () => ({
    accessToken: this.getAccessToken(),
    refreshToken: this.getRefreshToken()
  });

  hasTokens = () =>!!this.getAccessToken();

  // ============ USER ============
  getUser = () => {
    try {
      const data = localStorage.getItem(TokenManagerClass.TOKEN_KEYS.USER);
      return data? JSON.parse(data) : null;
    } catch { return null; }
  };

  setUser = (user) => {
    try {
      if (!user) return this.removeUser();
      localStorage.setItem(TokenManagerClass.TOKEN_KEYS.USER, JSON.stringify(user));
      if (user.id) localStorage.setItem(TokenManagerClass.TOKEN_KEYS.USER_ID, String(user.id));
      if (user.role) localStorage.setItem(TokenManagerClass.TOKEN_KEYS.USER_ROLE, user.role);
    } catch (e) { console.error('setUser error', e); }
  };

  removeUser = () => {
    try {
      [TokenManagerClass.TOKEN_KEYS.USER, TokenManagerClass.TOKEN_KEYS.USER_ID, TokenManagerClass.TOKEN_KEYS.USER_ROLE]
       .forEach(k => localStorage.removeItem(k));
    } catch {}
  };

  getUserId = () => localStorage.getItem(TokenManagerClass.TOKEN_KEYS.USER_ID);
  getUserRole = () => localStorage.getItem(TokenManagerClass.TOKEN_KEYS.USER_ROLE);

  // ============ EXPIRY & STATUS ============
  isTokenExpired = () => {
    const raw = this.getRawAccessToken();
    if (!raw) return true;
    return this._isExpired(raw, 0);
  };

  getTokenRemainingTime = () => {
    try {
      const raw = this.getRawAccessToken();
      if (!raw) return 0;
      const payload = this._parsePayload(raw);
      if (!payload?.exp) return 0;
      return Math.max(0, Math.floor((payload.exp * 1000 - Date.now()) / 1000));
    } catch { return 0; }
  };

  isAuthenticated = () =>!!this.getAccessToken();
  isValidSession = () => this.isAuthenticated() &&!this.isTokenExpired();

  getAuthHeaders = () => {
    const token = this.getAccessToken();
    return token? { Authorization: `Bearer ${token}` } : {};
  };

  // ============ CLEAR ============
  removeTokens = () => {
    try {
      localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.USER);
      localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.USER_ID);
      localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.USER_ROLE);
      localStorage.removeItem(TokenManagerClass.TOKEN_KEYS.TOKEN_EXPIRY);
      TokenManagerClass.LEGACY_KEYS.forEach(k => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } catch (e) { console.error('removeTokens error', e); }
  };

  clearTokens = () => this.removeTokens();
  clearAll = () => { try { localStorage.clear(); sessionStorage.clear(); } catch {} };

  debug = () => {
    const raw = this.getRawAccessToken();
    console.log('🔐 TokenManager Debug:', {
      hasValidToken:!!this.getAccessToken(),
      hasRawToken:!!raw,
      remainingSec: this.getTokenRemainingTime(),
      expired: this.isTokenExpired(),
      user: this.getUser()?.email || this.getUserId(),
      role: this.getUserRole()
    });
  };
}

const TokenManager = new TokenManagerClass();
export { TokenManager };
export default TokenManager;