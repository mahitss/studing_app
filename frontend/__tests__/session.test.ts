import { act, renderHook } from '@testing-library/react';
import { useSessionManager } from '../hooks/useSessionManager';
import { useStore } from '../lib/store';
import * as api from '../lib/api';

// Mock the API calls
jest.mock('../lib/api', () => ({
  startSession: jest.fn(),
  pauseSession: jest.fn(),
  resumeSession: jest.fn(),
  endSession: jest.fn(),
  getTodaySessions: jest.fn(),
}));

const mockUser = {
  _id: 'user123',
  name: 'Test Student',
  email: 'student@college.edu',
  college: 'Engineering',
  level: 1,
  xp: 0,
  badges: [],
  createdAt: '2026-05-22',
  updatedAt: '2026-05-22',
};

describe('useSessionManager Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();

    // Reset Zustand store state
    useStore.setState({
      user: mockUser,
      activeSession: null,
      dashboard: null,
      sessions: [],
      subject: 'General',
      studyMode: 'custom',
      plannedDuration: 45,
      riskMode: false,
      isActionLoading: false,
      error: null,
    });
  });

  it('should start a session successfully', async () => {
    const mockSession = {
      _id: 'session456',
      status: 'running',
      startedAt: new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      focusedMinutes: 0,
      pauseCount: 0,
      inactiveSeconds: 0,
      subject: 'General',
      studyMode: 'custom',
      plannedDurationMinutes: 45,
      riskMode: false,
      pauses: [],
      date: new Date().toISOString().slice(0, 10),
    };

    (api.startSession as jest.Mock).mockResolvedValueOnce({ session: mockSession });

    const { result } = renderHook(() => useSessionManager());

    await act(async () => {
      await result.current.handleStart();
    });

    expect(api.startSession).toHaveBeenCalledWith('user123', 'General', 'custom', 45, false);
    expect(useStore.getState().activeSession).toEqual(mockSession);
    expect(localStorage.getItem('gl-active-session')).toBe(JSON.stringify(mockSession));
  });

  it('should handle pause and resume transitions', async () => {
    const activeSession = {
      _id: 'session456',
      status: 'running',
      startedAt: new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
      elapsedSeconds: 10,
      focusedMinutes: 0,
      pauseCount: 0,
      inactiveSeconds: 0,
      subject: 'General',
      studyMode: 'custom',
      plannedDurationMinutes: 45,
      riskMode: false,
      pauses: [],
      date: new Date().toISOString().slice(0, 10),
    };

    useStore.setState({ activeSession });

    // Mock response for pause
    const pausedSession = { ...activeSession, status: 'paused', elapsedSeconds: 12, pauseCount: 1 };
    (api.pauseSession as jest.Mock).mockResolvedValueOnce({ session: pausedSession });

    const { result } = renderHook(() => useSessionManager());

    // Trigger Pause
    await act(async () => {
      await result.current.handlePauseResume();
    });

    expect(api.pauseSession).toHaveBeenCalledWith('user123', 'session456', 'manual');
    expect(useStore.getState().activeSession?.status).toBe('paused');
    expect(useStore.getState().activeSession?.pauseCount).toBe(1);

    // Mock response for resume
    const resumedSession = { ...pausedSession, status: 'running', lastStartedAt: new Date().toISOString() };
    (api.resumeSession as jest.Mock).mockResolvedValueOnce({ session: resumedSession });

    // Trigger Resume
    await act(async () => {
      await result.current.handlePauseResume();
    });

    expect(api.resumeSession).toHaveBeenCalledWith('user123', 'session456');
    expect(useStore.getState().activeSession?.status).toBe('running');
  });

  it('should end a session successfully', async () => {
    const activeSession = {
      _id: 'session456',
      status: 'running',
      startedAt: new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
      elapsedSeconds: 600,
      focusedMinutes: 10,
      pauseCount: 0,
      inactiveSeconds: 0,
      subject: 'General',
      studyMode: 'custom',
      plannedDurationMinutes: 45,
      riskMode: false,
      pauses: [],
      date: new Date().toISOString().slice(0, 10),
    };

    useStore.setState({ activeSession });
    localStorage.setItem('gl-active-session', JSON.stringify(activeSession));

    const mockDashboard = { todayStudyMinutes: 10 };
    const mockSessionsList = [{ _id: 'session456', focusedMinutes: 10 }];

    (api.endSession as jest.Mock).mockResolvedValueOnce({ dashboard: mockDashboard });
    (api.getTodaySessions as jest.Mock).mockResolvedValueOnce({ sessions: mockSessionsList });

    const { result } = renderHook(() => useSessionManager());

    await act(async () => {
      await result.current.handleEnd('Great focus', 0);
    });

    expect(api.endSession).toHaveBeenCalledWith(
      'user123',
      'session456',
      0,
      'Great focus',
      'General',
      'manual',
      0,
      '',
      'custom',
      45,
      false
    );
    expect(useStore.getState().activeSession).toBeNull();
    expect(useStore.getState().dashboard).toEqual(mockDashboard);
    expect(useStore.getState().sessions).toEqual(mockSessionsList);
    expect(localStorage.getItem('gl-active-session')).toBeNull();
  });

  it('should fallback to offline queue when endSession fails', async () => {
    const activeSession = {
      _id: 'session456',
      status: 'running',
      startedAt: new Date().toISOString(),
      lastStartedAt: new Date().toISOString(),
      elapsedSeconds: 600,
      focusedMinutes: 10,
      pauseCount: 0,
      inactiveSeconds: 0,
      subject: 'General',
      studyMode: 'custom',
      plannedDurationMinutes: 45,
      riskMode: false,
      pauses: [],
      date: new Date().toISOString().slice(0, 10),
    };

    useStore.setState({ activeSession });
    localStorage.setItem('gl-active-session', JSON.stringify(activeSession));

    (api.endSession as jest.Mock).mockRejectedValueOnce(new Error('Uplink failed'));

    const { result } = renderHook(() => useSessionManager());

    await act(async () => {
      await result.current.handleEnd('Great focus', 0);
    });

    expect(useStore.getState().activeSession).toBeNull();
    expect(localStorage.getItem('gl-active-session')).toBeNull();

    const offlineQueue = JSON.parse(localStorage.getItem('study-tracker-offline-queue') || '[]');
    expect(offlineQueue).toHaveLength(1);
    expect(offlineQueue[0]).toMatchObject({
      startedAt: activeSession.startedAt,
      subject: 'General',
      studyMode: 'custom',
      notes: 'Great focus',
      date: activeSession.date
    });
    expect(offlineQueue[0]).toHaveProperty('endedAt');
    expect(offlineQueue[0]).toHaveProperty('focusedMinutes');

    expect(useStore.getState().error).toContain('Uplink offline. Study session queued locally');
  });
});
