import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser, useUpdateUser } from "../domain/useUsers";
import { UserForm, UserFormData } from "../ui/UserForm";
import { PageLayout } from "@/shared/components/PageLayout";
import { Card, CardContent } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { Id } from "../../../server/_generated/dataModel";

function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUser(id as Id<"users">);
  const updateUser = useUpdateUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      await updateUser({
        id: id as Id<"users">,
        name: data.name,
        email: data.email,
        avatar: data.avatar || undefined,
      });
      toast.success("User updated successfully");
      navigate("/users");
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <PageLayout topBarTitle="Edit User" footer="none">
        <div className="p-4 text-center text-muted-foreground">
          Loading user...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      topBarTitle="Edit User"
      footer="none"
    >
      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-h1 text-foreground">Edit User</h2>
          <p className="text-paragraph-lg text-muted-foreground">
            Update {user.name}'s information
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <UserForm
              defaultValues={{
                name: user.name,
                email: user.email,
                avatar: user.avatar,
              }}
              onSubmit={handleSubmit}
              submitLabel="Update User"
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

export default EditUserPage;
