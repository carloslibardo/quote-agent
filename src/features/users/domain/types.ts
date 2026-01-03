import { Doc, Id } from "../../../server/_generated/dataModel";

export type User = Doc<"users">;
export type UserId = Id<"users">;

export interface CreateUserDto {
  name: string;
  email: string;
  avatar?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  avatar?: string;
}
