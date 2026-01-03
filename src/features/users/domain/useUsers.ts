import { useQuery, useMutation } from "convex/react";
import { api } from "../../../server/_generated/api";
import type { UserId } from "./types";

export function useUsers() {
  const users = useQuery(api.users.list);
  return users ?? [];
}

export function useUser(id: UserId | undefined) {
  const user = useQuery(api.users.get, id ? { id } : "skip");
  return user ?? null;
}

export function useCreateUser() {
  return useMutation(api.users.create);
}

export function useUpdateUser() {
  return useMutation(api.users.update);
}

export function useDeleteUser() {
  return useMutation(api.users.remove);
}
