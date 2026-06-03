import React from 'react';
import { render, act } from '@testing-library/react';
import { useSocketSync } from '../hooks/useSocketSync';
import { useStore } from '../lib/store';
import { socket } from '../lib/api';

// Mock the API module
jest.mock('../lib/api', () => {
  const listeners: Record<string, Function[]> = {};
  const mockSocket = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    emit: jest.fn(),
    on: jest.fn((event: string, callback: Function) => {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
    }),
    off: jest.fn((event: string) => {
      delete listeners[event];
    }),
    // Helper to simulate receiving a socket event in tests
    trigger: (event: string, ...args: any[]) => {
      if (listeners[event]) {
        listeners[event].forEach(cb => cb(...args));
      }
    }
  };

  return {
    socket: mockSocket,
    HAS_BACKEND: true,
    fetchDashboard: jest.fn(),
    getLiveFriends: jest.fn(),
    fetchDuels: jest.fn(),
    fetchRooms: jest.fn(),
  };
});

const TestComponent = () => {
  useSocketSync();
  return <div data-testid="test-hook" />;
};

describe('useSocketSync Hook Integration', () => {
  const mockUser = {
    _id: 'user123',
    name: 'Socket User',
    college: 'Science',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      const { setUser } = useStore.getState();
      setUser(mockUser);
    });
  });

  afterEach(() => {
    act(() => {
      const { setUser, setError, setLiveFriends, setDuels, setRooms, setDashboard } = useStore.getState();
      setUser(null);
      setError(null);
      setLiveFriends([]);
      setDuels([]);
      setRooms([]);
      setDashboard(null);
    });
  });

  it('should connect, authenticate, and register listeners on mount', () => {
    const mockSocket = socket as any;
    render(<TestComponent />);

    expect(mockSocket.connect).toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('authenticate', 'user123');
    expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('friend-update', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('duel-update', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('room-update', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
  });

  it('should trigger getLiveFriends and update store on friend-update event', async () => {
    const { getLiveFriends } = require('../lib/api');
    const mockFriends = [{ userId: 'friend1', name: 'Friend 1', level: 2, studyingNow: true }];
    const mockMessage = "Friend is studying!";
    getLiveFriends.mockResolvedValue({ friends: mockFriends, liveMessage: mockMessage });

    render(<TestComponent />);
    
    const mockSocket = socket as any;
    
    await act(async () => {
      mockSocket.trigger('friend-update');
      // Wait for async state updates to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(getLiveFriends).toHaveBeenCalledWith('user123');
    expect(useStore.getState().liveFriends).toEqual(mockFriends);
    expect(useStore.getState().liveMessage).toBe(mockMessage);
  });

  it('should trigger fetchDuels and update store on duel-update event', async () => {
    const { fetchDuels } = require('../lib/api');
    const mockDuels = [{ _id: 'duel1', challengerId: 'user123' }];
    fetchDuels.mockResolvedValue(mockDuels);

    render(<TestComponent />);

    const mockSocket = socket as any;
    
    await act(async () => {
      mockSocket.trigger('duel-update');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(fetchDuels).toHaveBeenCalledWith('user123');
    expect(useStore.getState().duels).toEqual(mockDuels);
  });

  it('should trigger fetchRooms and update store on room-update event', async () => {
    const { fetchRooms } = require('../lib/api');
    const mockRooms = [{ _id: 'room1', name: 'Focus Room' }];
    fetchRooms.mockResolvedValue(mockRooms);

    render(<TestComponent />);

    const mockSocket = socket as any;
    
    await act(async () => {
      mockSocket.trigger('room-update');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(fetchRooms).toHaveBeenCalled();
    expect(useStore.getState().rooms).toEqual(mockRooms);
  });

  it('should re-authenticate, trigger fetchDashboard, and update store on reconnect event', async () => {
    const { fetchDashboard } = require('../lib/api');
    const mockDashboard = { todayGoal: { completed: true } };
    fetchDashboard.mockResolvedValue(mockDashboard);

    render(<TestComponent />);

    const mockSocket = socket as any;
    
    await act(async () => {
      mockSocket.trigger('reconnect');
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockSocket.emit).toHaveBeenLastCalledWith('authenticate', 'user123');
    expect(fetchDashboard).toHaveBeenCalledWith('user123');
    expect(useStore.getState().dashboard).toEqual(mockDashboard);
  });

  it('should set an error on reconnect_failed event', () => {
    render(<TestComponent />);

    const mockSocket = socket as any;
    
    act(() => {
      mockSocket.trigger('reconnect_failed');
    });

    expect(useStore.getState().error).toContain('Maximum reconnection attempts reached');
  });

  it('should clean up listeners and disconnect socket on unmount', () => {
    const mockSocket = socket as any;
    const { unmount } = render(<TestComponent />);

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith('connect');
    expect(mockSocket.off).toHaveBeenCalledWith('friend-update');
    expect(mockSocket.off).toHaveBeenCalledWith('duel-update');
    expect(mockSocket.off).toHaveBeenCalledWith('room-update');
    expect(mockSocket.off).toHaveBeenCalledWith('reconnect');
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
