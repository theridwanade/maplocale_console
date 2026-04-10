import { create } from "zustand";

export const MappingMode = {
  WALKING: "WALKING",
  DRIVING: "DRIVING",
  CYCLING: "CYCLING",
  OTHER: "OTHER",
} as const;

export type MappingMode = (typeof MappingMode)[keyof typeof MappingMode];

export interface GpsPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface MappingSessionMetadata {
  id: string;
  name: string;
  mappingMode: MappingMode;
  startedAt: string;
  endedAt: string | null;
  isValid: boolean;
  rawTracks: GpsPoint[] | null;
}

interface MappingSessionState {
  isSessionActive: boolean;
  points: GpsPoint[];
  mappingSessionMetadata: MappingSessionMetadata | null;
  initiateSession: (metadata: MappingSessionMetadata) => void;
  startSession: () => void;
  stopSession: () => void;
  addPoint: (point: GpsPoint) => void;
  clearPoints: () => void;
}

export const useMappingSessionStore = create<MappingSessionState>((set) => ({
  isSessionActive: false,
  points: [],
  mappingSessionMetadata: null,
  initiateSession: (metadata: MappingSessionMetadata) =>
    set({ mappingSessionMetadata: metadata }),
  startSession: () => set({ isSessionActive: true, points: [] }),
  stopSession: () => set({ isSessionActive: false }),
  addPoint: (point: GpsPoint) =>
    set((state) => ({ points: [...state.points, point] })),
  clearPoints: () => set({ points: [] }),
}));