import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateUser } from "../domain/useUsers";
import { UserForm, UserFormData } from "../ui/UserForm";
import { PageLayout } from "@/shared/components/PageLayout";
import { Card, CardContent } from "@/shared/components/ui/card";
import { toast } from "sonner";

function CreateUserPage() {
  const navigate = useNavigate();
  const createUser = useCreateUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: UserFormData) => {
    setIsSubmitting(true);
    try {
      await createUser({
        name: data.name,
        email: data.email,
        avatar: data.avatar || undefined,
      });
      toast.success("User created successfully");
      navigate("/users");
    } catch (error) {
      toast.error("Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout
      topBarTitle="New User"
      footer="none"
    >
      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-h1 text-foreground">New User</h2>
          <p className="text-paragraph-lg text-muted-foreground">
            Create a new user
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <UserForm
              onSubmit={handleSubmit}
              submitLabel="Create User"
              isSubmitting={isSubmitting}
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

export default CreateUserPage;
