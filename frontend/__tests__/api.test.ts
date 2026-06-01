import { saveAuthSession, clearAuthSession } from '../lib/api';

describe('API Auth Session Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save authentication details to localStorage', () => {
    saveAuthSession('user123', 'mockToken');
    expect(localStorage.getItem('study-tracker-user-id')).toBe('user123');
    expect(localStorage.getItem('study-tracker-auth-token')).toBe('mockToken');
  });

  it('should clear authentication details from localStorage', () => {
    saveAuthSession('user123', 'mockToken');
    clearAuthSession();
    expect(localStorage.getItem('study-tracker-user-id')).toBeNull();
    expect(localStorage.getItem('study-tracker-auth-token')).toBeNull();
  });
});

describe('HAS_BACKEND Precedence Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('should set HAS_BACKEND to true by default (when preference is missing)', () => {
    const { HAS_BACKEND } = require('../lib/api');
    expect(HAS_BACKEND).toBe(true);
  });

  it('should set HAS_BACKEND to true when preference is explicitly set to "false"', () => {
    localStorage.setItem('study-tracker-pref-mock', 'false');
    const { HAS_BACKEND } = require('../lib/api');
    expect(HAS_BACKEND).toBe(true);
  });

  it('should set HAS_BACKEND to false when preference is explicitly set to "true"', () => {
    localStorage.setItem('study-tracker-pref-mock', 'true');
    const { HAS_BACKEND } = require('../lib/api');
    expect(HAS_BACKEND).toBe(false);
  });
});
