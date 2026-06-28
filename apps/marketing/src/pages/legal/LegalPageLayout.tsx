import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";

export const LEGAL_EFFECTIVE_DATE = "June 28, 2026";

interface LegalPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

const LegalPageLayout = ({ title, description, children }: LegalPageLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl px-4 py-12">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <h1 className="mb-2 text-4xl font-bold">{title}</h1>
        <p className="mb-3 text-muted-foreground">Effective date: {LEGAL_EFFECTIVE_DATE}</p>
        {description ? <p className="mb-8 text-lg text-muted-foreground">{description}</p> : null}

        <div className="prose prose-neutral max-w-none space-y-8 dark:prose-invert">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LegalPageLayout;
