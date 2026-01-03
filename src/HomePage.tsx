import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/shared/components/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Users, FileText, Settings } from "lucide-react";

function HomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "User Management",
      description: "Complete CRUD example with DDD architecture",
      action: () => navigate("/users"),
      buttonText: "View Users",
    },
    {
      icon: FileText,
      title: "Architecture",
      description: "Domain-Driven Design pattern with Convex backend",
      action: null,
      buttonText: "Learn More",
    },
    {
      icon: Settings,
      title: "Components",
      description: "49 shadcn/ui components ready to use",
      action: null,
      buttonText: "Explore",
    },
  ];

  return (
    <PageLayout
      topBarTitle="Welcome"
      footer="none"
    >
      <div className="p-4 space-y-6 max-w-2xl mx-auto w-full">
        <div className="space-y-2">
          <h2 className="text-h1 text-foreground">Welcome</h2>
          <p className="text-paragraph-lg text-muted-foreground">
            A clean React + Vite + Convex template with DDD architecture
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              This template provides a production-ready foundation for building modern web applications
              with React, TypeScript, Convex, and shadcn/ui components.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={feature.action ?? undefined}
                    disabled={!feature.action}
                  >
                    {feature.buttonText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
}
export default HomePage;
