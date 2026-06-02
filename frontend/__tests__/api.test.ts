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
  const originalDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
    process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode;
  });

  it('should set HAS_BACKEND to true by default (when preference is missing)', () => {
    delete process.env.NEXT_PUBLIC_DEMO_MODE;
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

describe('API request retry and offline sync logic', () => {
  const originalDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false'; // Ensure HAS_BACKEND is true
    originalFetch = global.fetch;
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_DEMO_MODE = originalDemoMode;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('should retry on retryable errors (e.g. 500) and eventually succeed', async () => {
    // Mock setTimeout to run immediately for retry delays (< 10000ms)
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
      if (ms && ms < 10000) {
        fn();
      }
      return 0 as any;
    });

    const mockFetch = global.fetch as jest.Mock;
    
    // First call returns 500
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server Error' }),
    });

    // Second call returns 200 with dashboard data
    const mockDashboard = { todayStudyMinutes: 30 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDashboard,
    });

    const { fetchDashboard } = require('../lib/api');
    const result = await fetchDashboard('user123');

    expect(result).toEqual(mockDashboard);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors (e.g. 400)', async () => {
    const mockFetch = global.fetch as jest.Mock;
    
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad Request' }),
    });

    const { fetchDashboard } = require('../lib/api');
    await expect(fetchDashboard('user123')).rejects.toThrow('Bad Request');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should timeout and throw descriptive error after 12 seconds', async () => {
    // Mock setTimeout to execute immediately for all delays (both 12s abort and retry delays)
    jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, ms?: number) => {
      fn();
      return 0 as any;
    });

    const mockFetch = global.fetch as jest.Mock;
    // Mock fetch to simulate a hanging request that gets aborted
    mockFetch.mockImplementation(async (url, init) => {
      if (init && init.signal) {
        if (init.signal.aborted) {
          const err = new Error('The user aborted a request.');
          err.name = 'AbortError';
          throw err;
        }
        return new Promise((resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The user aborted a request.');
            err.name = 'AbortError';
            reject(err);
          });
        });
      }
      return new Response();
    });

    const { fetchDashboard } = require('../lib/api');
    await expect(fetchDashboard('user123')).rejects.toThrow('Request timed out after 12 seconds.');
  });

  it('should sync offline sessions and call the offline-sync endpoint', async () => {
    const mockFetch = global.fetch as jest.Mock;
    const mockResponse = { synced: 2, dashboard: { todayStudyMinutes: 45 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const sessions = [
      { startedAt: '2026-06-02T10:00:00Z', endedAt: '2026-06-02T10:30:00Z', focusedMinutes: 30 },
      { startedAt: '2026-06-02T11:00:00Z', endedAt: '2026-06-02T11:45:00Z', focusedMinutes: 45 },
    ];

    const { syncOfflineSessions } = require('../lib/api');
    const result = await syncOfflineSessions('user123', sessions);

    expect(result).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    const [calledUrl, calledInit] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('/users/user123/sessions/offline-sync');
    expect(JSON.parse(calledInit.body)).toEqual({ sessions });
  });

  it('should not call endpoint when sessions list is empty', async () => {
    const mockFetch = global.fetch as jest.Mock;
    const { syncOfflineSessions } = require('../lib/api');
    const result = await syncOfflineSessions('user123', []);
    
    expect(result).toEqual({ synced: 0, dashboard: {} });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

