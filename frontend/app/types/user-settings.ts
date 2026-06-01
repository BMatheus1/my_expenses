export type UserSettings = {
  id: string;
  user_id: string;
  app_theme: string;
  app_mode: "light" | "dark";
  daily_review_enabled: boolean;
  daily_review_time: string | null;
  purpose_onboarding_seen: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateUserSettingsRequest = Partial<{
  app_theme: string;
  app_mode: "light" | "dark";
  daily_review_enabled: boolean;
  daily_review_time: string | null;
  purpose_onboarding_seen: boolean;
  notifications_enabled: boolean;
}>;
