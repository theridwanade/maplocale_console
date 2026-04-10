"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { getErrorMessage, isUnauthorizedError } from "@/lib/error";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

export default function Login() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuthStore();

  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.post<LoginResponse>("/auth/login", credentials);
      setUser(data.user);
      router.push(redirectPath);
      toast.success("Login successful.");
    } catch (error) {
      if (isUnauthorizedError(error)) {
        toast.error("Invalid email or password.");
        return;
      }

      toast.error(getErrorMessage(error, "Login failed. Please try again."));
      console.error("Login failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen mx-5">
      <Card className="w-full max-w-100">
        <CardHeader>
          <CardTitle>
            Login to start mapping with the MapLocale Console
          </CardTitle>
          <CardDescription>
            Enter your login credentials to access the MapLocale Console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="email" className="mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address john@maplocale.tech"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials({ ...credentials, email: e.target.value })
                }
              />
            </div>
            <div className="mb-4">
              <Link
                href="/forgot-password"
                className={cn(buttonVariants({ variant: "link" }), "float-end")}
              >
                Forgot Password?
              </Link>
              <Label htmlFor="password" className="mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
              />
            </div>
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner className="mr-2" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
