import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/shared/services/api";
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchMobileAppVersionSettings,
  patchAnnouncementStatus,
  updateAnnouncement,
  updateMobileAppVersionSettings,
} from "./api";
import type { Announcement, AnnouncementPayload, AnnouncementStatus } from "./schemas";

export const settingsKeys = {
  announcements: (statusFilter: string) =>
    ["settings", "announcements", { statusFilter }] as const,
  mobileAppVersions: () => ["settings", "mobileAppVersions"] as const,
};

export function useAnnouncements(statusFilter: string) {
  return useQuery({
    queryKey: settingsKeys.announcements(statusFilter),
    queryFn: ({ signal }) => fetchAnnouncements({ status: statusFilter || undefined }, signal),
    staleTime: 30_000,
  });
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AnnouncementPayload) => createAnnouncement(payload),
    onSuccess: () => {
      toast.success("Announcement created.");
      void queryClient.invalidateQueries({ queryKey: ["settings", "announcements"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the announcement.",
      ),
  });
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: AnnouncementPayload }) =>
      updateAnnouncement(id, payload),
    onSuccess: () => {
      toast.success("Announcement updated.");
      void queryClient.invalidateQueries({ queryKey: ["settings", "announcements"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the announcement.",
      ),
  });
}

export function usePatchAnnouncementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      announcement,
      status,
    }: {
      announcement: Announcement;
      status: AnnouncementStatus;
    }) => patchAnnouncementStatus(announcement, status),
    onSuccess: (_data, { status }) => {
      toast.success(status === "published" ? "Announcement published." : "Announcement archived.");
      void queryClient.invalidateQueries({ queryKey: ["settings", "announcements"] });
    },
    onError: () => toast.error("Could not update the announcement."),
  });
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAnnouncement(id),
    onSuccess: () => {
      toast.success("Announcement deleted.");
      void queryClient.invalidateQueries({ queryKey: ["settings", "announcements"] });
    },
    onError: () => toast.error("Could not delete the announcement."),
  });
}

export function useMobileAppVersionSettings() {
  return useQuery({
    queryKey: settingsKeys.mobileAppVersions(),
    queryFn: ({ signal }) => fetchMobileAppVersionSettings(signal),
    staleTime: 60_000,
  });
}

export function useUpdateMobileAppVersionSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { androidLatestVersion: string; iosLatestVersion: string }) =>
      updateMobileAppVersionSettings(payload),
    onSuccess: (data) => {
      toast.success("Mobile app versions updated.");
      queryClient.setQueryData(settingsKeys.mobileAppVersions(), data);
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.status === 403
          ? "You do not have permission to change application settings."
          : "Could not save mobile app versions.",
      ),
  });
}
