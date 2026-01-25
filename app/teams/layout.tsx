import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teams | Adelaide Super League',
  description: 'View all teams in Adelaide Super League',
};

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}



