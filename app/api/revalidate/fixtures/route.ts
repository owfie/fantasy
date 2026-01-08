import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route for on-demand revalidation of fixture pages
 * Can be called via webhook or directly when fixtures are updated externally
 * 
 * Usage:
 * - POST /api/revalidate/fixtures?fixtureId=<id> - Revalidate specific fixture
 * - POST /api/revalidate/fixtures - Revalidate all fixtures
 * 
 * Optional: Add authentication/authorization check here
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fixtureId = searchParams.get('fixtureId');

    if (fixtureId) {
      // Revalidate specific fixture page
      revalidatePath(`/fixtures/${fixtureId}`);
      return NextResponse.json({ 
        revalidated: true, 
        path: `/fixtures/${fixtureId}` 
      });
    } else {
      // Revalidate fixtures list and all fixture pages
      revalidatePath('/fixtures');
      // Note: Revalidating all fixture pages would require fetching all IDs
      // For now, just revalidate the list page
      return NextResponse.json({ 
        revalidated: true, 
        path: '/fixtures' 
      });
    }
  } catch (err) {
    return NextResponse.json({ 
      error: 'Error revalidating', 
      message: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}

