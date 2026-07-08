import Link from 'next/link';
import { Button } from '@browserai/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">BrowserAI</h1>
          <nav className="flex gap-4">
            <Link href="/auth/login" className="text-sm hover:text-muted-foreground">
              Login
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Sign Up</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl text-center space-y-6">
          <h2 className="text-5xl font-bold">Browser Infrastructure for AI Agents</h2>
          <p className="text-xl text-muted-foreground">
            Launch isolated, stealth browser sessions. Execute actions. Extract structured data.
          </p>
          <div className="flex gap-4 justify-center pt-6">
            <Link href="/auth/signup">
              <Button size="lg">Get Started</Button>
            </Link>
            <a href="https://docs.example.com">
              <Button size="lg" variant="outline">
                Documentation
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-secondary">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 BrowserAI. Coming soon.</p>
        </div>
      </footer>
    </div>
  );
}
