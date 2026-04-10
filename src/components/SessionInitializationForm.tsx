import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { MappingMode, type MappingMode as MappingModeType } from "@/store/useMappingSessionStore";

interface SessionInitializationFormProps {
  onSubmit: (payload: { name: string; mappingMode: MappingModeType }) => Promise<void>;
  disabled?: boolean;
}

const mappingModeLabels: Record<MappingModeType, string> = {
  WALKING: "Walking",
  DRIVING: "Driving",
  CYCLING: "Cycling",
  OTHER: "Other",
};

export function SessionInitializationForm({ onSubmit, disabled = false }: SessionInitializationFormProps) {
  const [name, setName] = useState("");
  const [mappingMode, setMappingMode] = useState<MappingModeType>(MappingMode.WALKING);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setValidationError("Session name is required.");
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      await onSubmit({ name: trimmedName, mappingMode });
      setName("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Initialize Mapping Session</CardTitle>
        <CardDescription>
          Enter a session name and choose the mapping mode to begin collecting GPS points.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="Example: City Center Survey"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={disabled || submitting}
              aria-invalid={validationError ? true : undefined}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapping-mode">Mapping Mode</Label>
            <Select
              value={mappingMode}
              onValueChange={(value) => setMappingMode(value as MappingModeType)}
              disabled={disabled || submitting}
            >
              <SelectTrigger id="mapping-mode" className="w-full h-9 text-sm">
                <SelectValue placeholder="Select mapping mode" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(MappingMode).map((mode) => (
                  <SelectItem value={mode} key={mode}>
                    {mappingModeLabels[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {validationError ? <p className="text-xs text-destructive">{validationError}</p> : null}

          <Button type="submit" disabled={disabled || submitting}>
            {submitting ? (
              <>
                <Spinner className="mr-2" />
                Initializing...
              </>
            ) : (
              "Initialize Session"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
