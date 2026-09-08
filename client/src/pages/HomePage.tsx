import { useHealth } from '../hooks/useHealth';

function getApiStatusLabel(isPending: boolean, isError: boolean): string {
  if (isPending) {
    return 'Checking...';
  }

  if (isError) {
    return 'Disconnected';
  }

  return 'Connected';
}

export function HomePage() {
  const { isPending, isError, isSuccess } = useHealth();
  const status = getApiStatusLabel(isPending, isError);

  return (
    <main className="page">
      <section className="hero">
        <h1>DevPath</h1>
        <p className="tagline">AI-assisted developer training platform</p>
        <p className={`status ${isSuccess ? 'status-ok' : isError ? 'status-error' : ''}`}>
          API Status: {status}
        </p>
      </section>
    </main>
  );
}
