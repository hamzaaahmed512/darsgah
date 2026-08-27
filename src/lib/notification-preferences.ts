export type NotificationPreferences = {
  attendanceDeadlineEnabled: boolean;
  attendanceDeadlineTime: string;
  leaveRequestNotificationsEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  attendanceDeadlineEnabled: true,
  attendanceDeadlineTime: "12:00",
  leaveRequestNotificationsEnabled: true
};

function normalizeTime(value: unknown) {
  if (typeof value !== "string") return DEFAULT_NOTIFICATION_PREFERENCES.attendanceDeadlineTime;
  return /^\d{2}:\d{2}$/.test(value) ? value : DEFAULT_NOTIFICATION_PREFERENCES.attendanceDeadlineTime;
}

export function resolveNotificationPreferences(settings: Record<string, any> | null | undefined): NotificationPreferences {
  const raw = settings?.notificationPreferences ?? {};
  return {
    attendanceDeadlineEnabled: raw.attendanceDeadlineEnabled !== false,
    attendanceDeadlineTime: normalizeTime(raw.attendanceDeadlineTime),
    leaveRequestNotificationsEnabled: raw.leaveRequestNotificationsEnabled !== false
  };
}
