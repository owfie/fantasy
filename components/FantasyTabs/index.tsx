'use client';

import { usePathname, useRouter } from 'next/navigation';
import { SegmentedController } from '@/components/SegmentedController';

type TabId = 'team-builder' | 'leaderboard';

const TAB_OPTIONS: { id: TabId; label: string }[] = [
  { id: 'team-builder', label: 'Team Builder' },
  { id: 'leaderboard', label: 'Leaderboard' },
];

export function FantasyTabs() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from pathname
  const activeTab: TabId = pathname.includes('/leaderboard') ? 'leaderboard' : 'team-builder';

  const handleTabChange = (values: TabId[]) => {
    const newTab = values[0];
    if (newTab && newTab !== activeTab) {
      router.push(`/fantasy/${newTab}`);
    }
  };

  return (
    <SegmentedController
      options={TAB_OPTIONS}
      selectedValues={[activeTab]}
      onChange={handleTabChange}
    />
  );
}
