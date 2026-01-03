import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PageLayout } from "@/shared/components/PageLayout";

function NotFoundPage() {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <PageLayout>
      <div className="text-center py-20">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">
          Oops! Page not found
        </p>
        <a href="/" className="text-primary underline hover:text-primary/80">
          Return to Home
        </a>
      </div>
    </PageLayout>
  );
}

export default NotFoundPage;
