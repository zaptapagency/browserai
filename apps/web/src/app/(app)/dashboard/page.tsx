/**
 * Dashboard - main authenticated app view
 * Full implementation in M4
 */

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        <p className="text-muted-foreground mb-8">
          Welcome to BrowserAI! The dashboard will be fully wired in Milestone 4.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {['Sessions', 'Tasks', 'Workflows'].map((item) => (
            <div key={item} className="border border-border rounded-lg p-6 bg-secondary">
              <h3 className="font-semibold mb-2">{item}</h3>
              <p className="text-sm text-muted-foreground">Coming in M4</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
