export type User = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  email_verified: boolean;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type MessageResponse = {
  message: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  terms_accepted: boolean;
};

export type GoogleLoginRequest = {
  credential: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  password: string;
};

export type VerifyEmailRequest = {
  token: string;
};

export type ResendVerificationEmailRequest = {
  email: string;
};