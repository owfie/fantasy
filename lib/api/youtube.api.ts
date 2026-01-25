/**
 * YouTube API - Fetches latest video from a playlist
 */

const PLAYLIST_ID = 'PLzREfPIXZzdbMb1YmpWpSjRZuDvUypK1J';
const RSS_FEED_URL = `https://www.youtube.com/feeds/videos.xml?playlist_id=${PLAYLIST_ID}`;

interface YouTubeVideo {
  videoId: string;
  title: string;
  published: string;
  embedUrl: string;
}

/**
 * Fetches the latest video from the Super League YouTube playlist
 * Uses the RSS feed which doesn't require an API key
 */
export async function getLatestPlaylistVideo(): Promise<YouTubeVideo | null> {
  try {
    const response = await fetch(RSS_FEED_URL, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error('Failed to fetch YouTube RSS feed:', response.status);
      return null;
    }

    const xml = await response.text();
    
    // Parse the XML to extract the first video entry
    // The RSS feed returns videos in reverse chronological order (newest first)
    const videoIdMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = xml.match(/<media:title>([^<]+)<\/media:title>/);
    const publishedMatch = xml.match(/<published>([^<]+)<\/published>/);

    if (!videoIdMatch) {
      console.error('No video found in playlist RSS feed');
      return null;
    }

    const videoId = videoIdMatch[1];
    
    return {
      videoId,
      title: titleMatch ? titleMatch[1] : 'Adelaide Super League',
      published: publishedMatch ? publishedMatch[1] : new Date().toISOString(),
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    };
  } catch (error) {
    console.error('Error fetching YouTube playlist:', error);
    return null;
  }
}


