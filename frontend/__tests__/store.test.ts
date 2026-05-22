import { useStore } from '../lib/store';

describe('useStore Zustand Store', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    const { setScreen, setUser, setIsInitializing } = useStore.getState();
    setScreen('dashboard');
    setUser(null);
    setIsInitializing(false);
  });

  it('should initialize with default states', () => {
    const state = useStore.getState();
    expect(state.screen).toBe('dashboard');
    expect(state.user).toBeNull();
    expect(state.isInitializing).toBe(false);
  });

  it('should update active screen via setScreen', () => {
    const { setScreen } = useStore.getState();
    setScreen('timer');
    expect(useStore.getState().screen).toBe('timer');

    setScreen('analytics');
    expect(useStore.getState().screen).toBe('analytics');
  });

  it('should load user state via setUser', () => {
    const { setUser } = useStore.getState();
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
    
    setUser(mockUser);
    expect(useStore.getState().user).toEqual(mockUser);
  });

  it('should toggle isInitializing state', () => {
    const { setIsInitializing } = useStore.getState();
    setIsInitializing(true);
    expect(useStore.getState().isInitializing).toBe(true);

    setIsInitializing(false);
    expect(useStore.getState().isInitializing).toBe(false);
  });
});
