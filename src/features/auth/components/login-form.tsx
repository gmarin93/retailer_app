"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { ApiError, applyApiFieldErrors } from "@/shared/services/api";
import { credentialsSchema, type Credentials } from "../schemas";
import { useLogin } from "../hooks";

export function LoginForm() {
  const login = useLogin();
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
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.username || undefined}>
          <FieldLabel htmlFor="username">Username</FieldLabel>
          <Input
            id="username"
            autoComplete="username"
            aria-invalid={!!errors.username}
            {...form.register("username")}
          />
          {errors.username && <FieldError>{errors.username.message}</FieldError>}
        </Field>

        <Field data-invalid={!!errors.password || undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
          {errors.password && <FieldError>{errors.password.message}</FieldError>}
        </Field>

        {errors.root && <FieldError role="alert">{errors.root.message}</FieldError>}

        <Field>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending ? "Logging in…" : "Log in"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
