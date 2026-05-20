import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import axios from 'axios';

const router = Router();

// Helper to handle Spotify requests
const fetchFromSpotify = async (url: string, user: any) => {
  try {
    const response = await axios.get(url, {
      headers: { 'Authorization': `Bearer ${user.accessToken}` }
    });
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.status === 401) {
      throw new Error('Spotify token expired');
    }
    throw error;
  }
};

router.get('/artists', authenticate, async (req: AuthRequest, res) => {
  const time_range = req.query.time_range || 'medium_term';
  try {
    const data = await fetchFromSpotify(`https://api.spotify.com/v1/me/top/artists?limit=50&time_range=${time_range}`, req.user);
    res.json(data.items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

router.get('/tracks', authenticate, async (req: AuthRequest, res) => {
  const time_range = req.query.time_range || 'medium_term';
  try {
    const data = await fetchFromSpotify(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${time_range}`, req.user);
    res.json(data.items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

router.get('/genres', authenticate, async (req: AuthRequest, res) => {
  const time_range = req.query.time_range || 'medium_term';
  try {
    const data = await fetchFromSpotify(`https://api.spotify.com/v1/me/top/artists?limit=50&time_range=${time_range}`, req.user);
    
    const genreCounts: Record<string, number> = {};
    data.items.forEach((artist: any) => {
      artist.genres.forEach((genre: string) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    const sortedGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const totalGenres = sortedGenres.reduce((acc, curr) => acc + curr.count, 0);
    const diversityScore = Math.min(100, Math.round((sortedGenres.length / 50) * 100));

    res.json({
      genres: sortedGenres.slice(0, 20),
      total: totalGenres,
      diversityScore
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

router.get('/heatmap', authenticate, async (req: AuthRequest, res) => {
  try {
    const data = await fetchFromSpotify(`https://api.spotify.com/v1/me/player/recently-played?limit=50`, req.user);
    
    // Process recently played to group by date
    const dateCounts: Record<string, number> = {};
    data.items.forEach((item: any) => {
      const date = new Date(item.played_at).toISOString().split('T')[0];
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });

    const heatmapData = Object.entries(dateCounts).map(([date, count]) => ({ date, count }));
    res.json(heatmapData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

router.get('/personality', authenticate, async (req: AuthRequest, res) => {
  try {
    // 1. Get top tracks
    const tracksData = await fetchFromSpotify(`https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=medium_term`, req.user);
    const trackIds = tracksData.items.map((t: any) => t.id).join(',');

    if (!trackIds) {
       return res.json({ type: 'Newcomer', description: 'Not enough data yet.', scores: {} });
    }

    // 2. Get audio features for these tracks
    const featuresData = await fetchFromSpotify(`https://api.spotify.com/v1/audio-features?ids=${trackIds}`, req.user);
    
    let totalDanceability = 0;
    let totalEnergy = 0;
    let totalValence = 0;
    let totalAcousticness = 0;

    featuresData.audio_features.forEach((feature: any) => {
      if (feature) {
        totalDanceability += feature.danceability;
        totalEnergy += feature.energy;
        totalValence += feature.valence;
        totalAcousticness += feature.acousticness;
      }
    });

    const count = featuresData.audio_features.length;
    const averages = {
      danceability: totalDanceability / count,
      energy: totalEnergy / count,
      valence: totalValence / count,
      acousticness: totalAcousticness / count,
    };

    let personality = 'Versatile Listener';
    let title = 'The All-Rounder';
    if (averages.energy > 0.7 && averages.danceability > 0.7) {
      personality = 'Hyper Pop Maniac';
      title = 'High Energy & Danceable';
    } else if (averages.acousticness > 0.6 && averages.energy < 0.5) {
      personality = 'Midnight Dreamer';
      title = 'Calm & Acoustic';
    } else if (averages.valence < 0.4) {
      personality = 'Emotional Voyager';
      title = 'Deep & Melancholic';
    } else if (averages.energy > 0.8 && averages.valence < 0.5) {
      personality = 'Chaos Listener';
      title = 'Intense & Dark';
    }

    res.json({
      type: personality,
      title,
      scores: averages,
      topArtist: tracksData.items[0]?.artists[0]?.name || 'Unknown'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze personality' });
  }
});

export default router;
