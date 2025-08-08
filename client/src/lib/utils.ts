import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "غير محدد";
  }
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(Number(numAmount))) return "غير محدد";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(Number(numAmount));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function getStatusBadgeClass(status: string): string {
  const statusMap: Record<string, string> = {
    'نشطة': 'status-active',
    'معلقة': 'status-pending',
    'قيد التنفيذ': 'status-progress',
    'مكتملة': 'status-completed',
    'ملغية': 'status-cancelled',
  };
  
  return statusMap[status] || 'bg-gray-100 text-gray-800';
}
