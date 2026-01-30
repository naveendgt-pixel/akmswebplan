export const getAllowedEmail = () => {
  return process.env.NEXT_PUBLIC_ALLOWED_EMAIL?.toLowerCase() ?? "";
};

export const isAuthorizedEmail = (email?: string | null) => {
  const allowed = getAllowedEmail();
  if (!allowed) return true;
  return (email ?? "").toLowerCase() === allowed;
};
