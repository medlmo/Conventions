import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { LoginRequest } from "@shared/schema";

interface AuthUser {
  id: string;
  username: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

interface AuthResponse {
  user: AuthUser;
}

export function useAuth() {
  const { data: authData, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      return await apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });

  return {
    user: authData?.user || null,
    isLoading,
    isAuthenticated: !!authData?.user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    isLoginPending: loginMutation.isPending,
    isLogoutPending: logoutMutation.isPending,
    loginError: loginMutation.error,
  };
}

export function usePermissions() {
  const { user } = useAuth();
  
  const canCreateConvention = user?.role === "admin" || user?.role === "editor";
  const canEditConvention = user?.role === "admin" || user?.role === "editor";
  const canDeleteConvention = user?.role === "admin" || user?.role === "editor";
  const canManageUsers = user?.role === "admin";
  const canViewConventions = !!user; // All authenticated users can view

  return {
    canCreateConvention,
    canEditConvention,
    canDeleteConvention,
    canManageUsers,
    canViewConventions,
    userRole: user?.role,
  };
}