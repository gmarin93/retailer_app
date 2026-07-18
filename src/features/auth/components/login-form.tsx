"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LockIcon, UserIcon, ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "@/shared/lib/utils";
import { ApiError, applyApiFieldErrors } from "@/shared/services/api";
import { credentialsSchema, type Credentials } from "../schemas";
import { useLogin } from "../hooks";

export function LoginForm() {
  const login = useLogin();
  const [hidePassword, setHidePassword] = useState(true);
  const form = useForm<Credentials>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (credentials) => {
    try {
      await login.mutateAsync(credentials);
    } catch (error) {
      if (error instanceof ApiError) {
        applyApiFieldErrors(form, error);
        form.setError("root", { type: "server", message: error.message });
      } else {
        form.setError("root", {
          type: "server",
          message: "Unable to log in. Please try again.",
        });
      }
    }
  });

  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="sr-only">
          Username
        </label>
        <div
          className={cn(
            "group flex h-12 items-center gap-2 rounded-[10px] border bg-white px-3 transition-colors",
            "focus-within:border-[#4c6fff]",
            errors.username ? "border-destructive" : "border-[#d9e0ed]",
          )}
        >
          <HugeiconsIcon
            icon={UserIcon}
            className="size-5 shrink-0 text-[#90a1c2] transition-colors group-focus-within:text-[#4c6fff]"
            aria-hidden="true"
          />
          <input
            id="username"
            autoComplete="username"
            placeholder="Username"
            aria-invalid={!!errors.username}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[#121212] outline-none placeholder:text-[#90a1c2]"
            {...form.register("username")}
          />
        </div>
        {errors.username ? (
          <p className="text-[13px] text-destructive" role="alert">
            {errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="sr-only">
          Password
        </label>
        <div
          className={cn(
            "group flex h-12 items-center gap-2 rounded-[10px] border bg-white px-3 transition-colors",
            "focus-within:border-[#4c6fff]",
            errors.password ? "border-destructive" : "border-[#d9e0ed]",
          )}
        >
          <HugeiconsIcon
            icon={LockIcon}
            className="size-5 shrink-0 text-[#90a1c2] transition-colors group-focus-within:text-[#4c6fff]"
            aria-hidden="true"
          />
          <input
            id="password"
            type={hidePassword ? "password" : "text"}
            autoComplete="current-password"
            placeholder="Password"
            aria-invalid={!!errors.password}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-[#121212] outline-none placeholder:text-[#90a1c2]"
            {...form.register("password")}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label={hidePassword ? "Show password" : "Hide password"}
            aria-pressed={!hidePassword}
            onClick={() => setHidePassword((v) => !v)}
            className="flex shrink-0 text-[#90a1c2] transition-colors hover:text-[#6b7a99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/40"
          >
            <HugeiconsIcon
              icon={hidePassword ? ViewIcon : ViewOffIcon}
              className="size-5"
              aria-hidden="true"
            />
          </button>
        </div>
        {errors.password ? (
          <p className="text-[13px] text-destructive" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {errors.root ? (
        <p className="text-[13px] text-destructive" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={login.isPending}
        className={cn(
          "mt-1.5 h-12 w-full rounded-xl bg-[#4c6fff] text-[15px] font-semibold tracking-[0.01em] text-white",
          "shadow-[0_8px_20px_rgba(76,111,255,0.28)] transition-[background-color,box-shadow]",
          "hover:bg-[#3a5cf0] hover:shadow-[0_10px_24px_rgba(76,111,255,0.34)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4c6fff]/50 focus-visible:ring-offset-2",
          "disabled:cursor-default disabled:bg-[#4c6fff]/50 disabled:text-white/85 disabled:shadow-none",
        )}
      >
        {login.isPending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
