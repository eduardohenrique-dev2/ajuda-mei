import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { myRoles } from "@/lib/staff.functions";
import { useAuth } from "@/lib/auth-context";

export function useMyRoles() {
  const { user } = useAuth();
  const fetchRoles = useServerFn(myRoles);
  return useQuery({
    queryKey: ["my-roles", user?.id],
    queryFn: () => fetchRoles(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
