export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*/.test(error.message) || error.message.includes("غير مصرح");
}

export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "مدير النظام",
    editor: "محرر",
    viewer: "مشاهد",
  };
  return roleMap[role] || role;
}

export function getRoleBadgeClass(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "bg-red-100 text-red-800",
    editor: "bg-blue-100 text-blue-800", 
    viewer: "bg-gray-100 text-gray-800",
  };
  return roleMap[role] || "bg-gray-100 text-gray-800";
}