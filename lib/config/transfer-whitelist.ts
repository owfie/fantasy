// User IDs that can bypass transfer window restrictions
// Add user UUIDs to this array to allow them to make transfers even when the window is closed
export const TRANSFER_WINDOW_BYPASS_WHITELIST: string[] = [
  // Example: '2eb0941a-b6bf-418a-a711-4db9426f5161',
  // '63b4efa2-3597-4942-8bc9-958c39b5785e',
  // '2eb0941a-b6bf-418a-a711-4db9426f5161'
];

export function canBypassTransferWindow(userId: string | undefined): boolean {
  if (!userId) return false;
  return TRANSFER_WINDOW_BYPASS_WHITELIST.includes(userId);
}
