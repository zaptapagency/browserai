import Link from 'next/link';
import { Button } from '@browserai/ui';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-secondary">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground">Access your BrowserAI dashboard</p>
        </div>

        <div className="border border-border rounded-lg p-6 space-y-4 bg-background">
          <p className="text-sm text-muted-foreground text-center">
            🚀 Authentication wired in Milestone 1 (M1)
          </p>

          <Link href="/dashboard">
            <Button className="w-full" size="lg">
              Demo: Go to Dashboard
            </Button>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="underline hover:text-foreground">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
