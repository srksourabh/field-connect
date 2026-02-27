export type Role = "employee" | "manager" | "admin" | "super_admin";

export function isAdmin(role: string | undefined | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSuperAdmin(role: string | undefined | null): boolean {
  return role === "super_admin";
}

export function isHR(profile: { designation?: string | null; role?: string | null }): boolean {
  const desig = profile.designation?.toLowerCase() || "";
  return desig.includes("hr") && isAdmin(profile.role);
}

export function isUniversal(profile: { designation?: string | null; role?: string | null }): boolean {
  return isSuperAdmin(profile.role) || isHR(profile);
}
