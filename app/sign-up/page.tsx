import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignUp } from "@clerk/nextjs";
import { BrandMark } from "@/components/brand-mark";

type SignUpPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectUrl = params.next && params.next.startsWith("/") ? params.next : "/dashboard";

  return (
    <main className="min-h-screen bg-background">
      <div className="hero-mesh pointer-events-none fixed inset-0" />
      <div className="container relative flex min-h-screen flex-col py-6">
        <div className="flex items-center justify-between">
          <BrandMark />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to landing
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center py-12">
          <SignUp routing="hash" signInUrl="/login" fallbackRedirectUrl={redirectUrl} />
        </div>
      </div>
    </main>
  );
}
