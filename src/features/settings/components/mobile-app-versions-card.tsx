"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { SmartPhone01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { ErrorState } from "@/shared/components/error-state";
import { LoadingState } from "@/shared/components/loading-state";
import { useMobileAppVersionSettings, useUpdateMobileAppVersionSettings } from "../hooks";

const SEMVER = /^\d+\.\d+\.\d+$/;

const schema = z.object({
  androidLatestVersion: z
    .string()
    .min(1, "Version is required.")
    .regex(SEMVER, "Use the MAJOR.MINOR.PATCH format, e.g. 1.6.2."),
  iosLatestVersion: z
    .string()
    .min(1, "Version is required.")
    .regex(SEMVER, "Use the MAJOR.MINOR.PATCH format, e.g. 1.6.1."),
});
type FormValues = z.infer<typeof schema>;

export function MobileAppVersionsCard() {
  const query = useMobileAppVersionSettings();
  const mutation = useUpdateMobileAppVersionSettings();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { androidLatestVersion: "", iosLatestVersion: "" },
  });

  // Reset form whenever fresh data arrives (initial load or post-save).
  useEffect(() => {
    if (query.data) {
      reset({
        androidLatestVersion: query.data.androidLatestVersion,
        iosLatestVersion: query.data.iosLatestVersion,
      });
    }
  }, [query.data, reset]);

  const onSubmit = (values: FormValues) => {
    mutation.mutate(
      {
        androidLatestVersion: values.androidLatestVersion.trim(),
        iosLatestVersion: values.iosLatestVersion.trim(),
      },
      {
        onSuccess: () =>
          reset({
            androidLatestVersion: values.androidLatestVersion.trim(),
            iosLatestVersion: values.iosLatestVersion.trim(),
          }),
      },
    );
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
        </div>
        <div>
          <div className="font-semibold text-sm">Mobile Applications</div>
          <div className="text-xs text-muted-foreground">
            Latest published store versions. Older installs show the in-app update banner.
          </div>
        </div>
      </div>

      <div className="pt-4">
        {query.isLoading ? (
          <LoadingState label="Loading current versions…" />
        ) : query.isError ? (
          <ErrorState
            error={query.error}
            onRetry={() => query.refetch()}
          />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="android-version">Android Latest Version</Label>
                <Input
                  id="android-version"
                  placeholder="e.g. 1.6.2"
                  autoComplete="off"
                  spellCheck={false}
                  {...register("androidLatestVersion")}
                />
                {errors.androidLatestVersion && (
                  <p className="text-xs text-destructive">{errors.androidLatestVersion.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Current production version on Google Play.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ios-version">iOS Latest Version</Label>
                <Input
                  id="ios-version"
                  placeholder="e.g. 1.6.1"
                  autoComplete="off"
                  spellCheck={false}
                  {...register("iosLatestVersion")}
                />
                {errors.iosLatestVersion && (
                  <p className="text-xs text-destructive">{errors.iosLatestVersion.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Current production version on the App Store.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 mt-4 border-t">
              {query.data?.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Last updated{" "}
                  {formatDistanceToNow(new Date(query.data.updatedAt), { addSuffix: true })}
                  {query.data.updatedBy ? ` by ${query.data.updatedBy}` : ""}
                </p>
              )}
              <div className="flex-1" />
              {isDirty && !mutation.isPending && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    reset({
                      androidLatestVersion: query.data?.androidLatestVersion ?? "",
                      iosLatestVersion: query.data?.iosLatestVersion ?? "",
                    })
                  }
                >
                  Discard
                </Button>
              )}
              <Button type="submit" size="sm" disabled={!isDirty || mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
