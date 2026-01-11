import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Error | Adelaide Super League',
  description: 'Authentication error page for Adelaide Super League',
};

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params?.error || "An unspecified error occurred.";

  return (
    <div>
      <h1>Authentication Error</h1>
      <p>An error occurred during authentication.</p>
      {errorMessage && <p style={{ color: "red" }}>Error: {errorMessage}</p>}
    </div>
  );
}
