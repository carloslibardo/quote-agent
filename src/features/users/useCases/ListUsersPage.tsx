import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUsers, useDeleteUser } from "../domain/useUsers";
import { UserCard } from "../ui/UserCard";
import { Button } from "@/shared/components/ui/button";
import { EmptyState } from "@/shared/components/EmptyState";
import { PageLayout } from "@/shared/components/PageLayout";
import { Plus, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { User } from "../domain/types";
import { toast } from "sonner";

function ListUsersPage() {
  const navigate = useNavigate();
  const users = useUsers();
  const deleteUser = useDeleteUser();
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser({ id: userToDelete._id });
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <PageLayout
      topBarTitle="Users"
      footer="none"
    >
      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-h1 text-foreground">Users</h2>
            <p className="text-paragraph-lg text-muted-foreground">
              Manage your users
            </p>
          </div>
          <Button onClick={() => navigate("/users/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      {users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users yet"
          description="Get started by creating your first user"
          actionLabel="Add User"
          onAction={() => navigate("/users/new")}
        />
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <UserCard
              key={user._id}
              user={user}
              onEdit={(user) => navigate(`/users/${user._id}`)}
              onDelete={setUserToDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PageLayout>
  );
}

export default ListUsersPage;
