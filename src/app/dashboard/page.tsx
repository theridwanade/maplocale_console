"use client";
import { SessionInitializationForm } from "@/components/SessionInitializationForm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/error";
import { useAuthStore } from "@/store/useAuthStore";
import { GpsPoint, MappingMode, MappingSessionMetadata, useMappingSessionStore } from "@/store/useMappingSessionStore";
import { LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
  .process?.env?.NODE_ENV;

const isDevelopmentEnv =
  nodeEnv === "development" || process.env.MODE === "development";

const baseSpeedByMode: Record<MappingMode, number> = {
  WALKING: 1.4,
  DRIVING: 8.5,
  CYCLING: 4.7,
  OTHER: 2.2,
};

const buildSyntheticProgressivePath = (params: {
  mappingMode: MappingMode;
  seedPoint?: GpsPoint;
  pointCount?: number;
}): GpsPoint[] => {
  const { mappingMode, seedPoint, pointCount = 24 } = params;
  const startLatitude = seedPoint?.latitude ?? -6.2;
  const startLongitude = seedPoint?.longitude ?? 106.816666;
  const startedAt = seedPoint?.timestamp ?? Date.now() - pointCount * 1000;
  const baseSpeed = baseSpeedByMode[mappingMode];

  return Array.from({ length: pointCount }, (_, index) => {
    const step = index + 1;
    const latitude =
      startLatitude + step * 0.00012 + Math.sin(step * 0.35) * 0.000015;
    const longitude =
      startLongitude + step * 0.00014 + Math.cos(step * 0.28) * 0.000012;

    return {
      timestamp: startedAt + step * 1000,
      latitude,
      longitude,
      accuracy: 3.5 + (step % 5) * 0.9,
      altitude: 26 + step * 0.25,
      altitudeAccuracy: 1.2 + (step % 4) * 0.2,
      heading: (42 + step * 11) % 360,
      speed: Number((baseSpeed + (step % 3) * 0.35).toFixed(2)),
    };
  });
};

export default function Dashboard() {
  const { user, fetchUser } = useAuthStore();
  const router = useRouter();
  const {
    isSessionActive,
    points,
    initiateSession,
    mappingSessionMetadata,
    startSession,
    stopSession,
    addPoint,
    clearPoints,
  } = useMappingSessionStore();
  const [stoppingSession, setStoppingSession] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pollingIntervalRef = useRef<number | null>(null);

  const clearPolling = useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const collectGpsPoint = useCallback(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { coords, timestamp } = position;

        addPoint({
          timestamp,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          altitude: coords.altitude,
          altitudeAccuracy: coords.altitudeAccuracy,
          heading: coords.heading,
          speed: coords.speed,
        });
      },
      (error) => {
        console.error("GPS Error:", error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      },
    );
  }, [addPoint]);

  useEffect(() => {
    fetchUser()
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const handleInitializeSession = async (payload: {
    name: string;
    mappingMode: MappingMode;
  }) => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by this browser.");
      return;
    }

    try {
      const data = await api.post<MappingSessionMetadata>("/sessions", payload);
      initiateSession(data);
      startSession();
      collectGpsPoint();
      pollingIntervalRef.current = window.setInterval(collectGpsPoint, 1000);
      toast.success(`Session "${data.name}" has started.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to initialize session."));
    }
  };

  const handleStopSession = async () => {
    if (!mappingSessionMetadata?.id) {
      toast.error("No active session was found to stop.");
      return;
    }

    setStoppingSession(true);
    clearPolling();
    stopSession();

    try {
      const pointsForIngest = isDevelopmentEnv
        ? buildSyntheticProgressivePath({
            mappingMode: mappingSessionMetadata.mappingMode,
            seedPoint: points[0],
          })
        : points;

      console.log("Points to ingest:", pointsForIngest);

      if (pointsForIngest.length > 0) {
        await api.post(`/sessions/${mappingSessionMetadata.id}/ingest`, {
          points: pointsForIngest,
        });
      }

      if (isDevelopmentEnv) {
        toast.success(
          "Mapping session stopped and synthetic dev track uploaded.",
        );
      } else {
        toast.success("Mapping session stopped and track uploaded.");
      }

      clearPoints();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to ingest session track."));
      console.log(`Ingestion failed for points:`, error);
    } finally {
      setStoppingSession(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await useAuthStore.getState().logout();
      toast.success("Logged out successfully.");
      router.push("/auth/login");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to log out."));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 p-4">
      <Card>
        <CardHeader className="space-y-4 sm:flex sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                Welcome back, {user?.firstName ?? "Mapper"}!
              </CardTitle>
              <CardDescription>
                Here is an overview of your account.
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={loggingOut}
            className="sm:self-start"
          >
            {loggingOut ? (
              <>
                <Spinner className="mr-2" />
                Logging out...
              </>
            ) : (
              "Logout"
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-6 border rounded-lg bg-muted/20 text-muted-foreground text-sm space-y-2">
              <p>
                GPS mapping is currently{" "}
                <strong>{isSessionActive ? "active" : "inactive"}</strong>.
              </p>
              <p>Collected points in this session: {points.length}</p>

              {mappingSessionMetadata ? (
                <div className="pt-2 space-y-1 text-xs">
                  <p>
                    <strong>Session:</strong> {mappingSessionMetadata.name}
                  </p>
                  <p>
                    <strong>Mode:</strong> {mappingSessionMetadata.mappingMode}
                  </p>
                  <p>
                    <strong>Started:</strong>{" "}
                    {new Date(
                      mappingSessionMetadata.startedAt,
                    ).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </div>

            {!isSessionActive ? (
              <SessionInitializationForm
                onSubmit={handleInitializeSession}
                disabled={stoppingSession}
              />
            ) : (
              <Button
                onClick={handleStopSession}
                variant="destructive"
                disabled={stoppingSession}
              >
                {stoppingSession
                  ? "Stopping session..."
                  : "Stop Mapping Session"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
