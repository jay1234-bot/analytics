import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const router = Router();

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

router.get('/login', (req, res) => {
  const scope = 'user-read-private user-read-email user-top-read user-read-recently-played';
  const state = Math.random().toString(36).substring(7);
  
  const authQueryParameters = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID || '',
    scope: scope,
    redirect_uri: SPOTIFY_REDIRECT_URI || '',
    state: state
  });

  res.redirect('https://accounts.spotify.com/authorize?' + authQueryParameters.toString());
});

router.get('/callback', async (req, res) => {
  const code = req.query.code as string || null;
  const state = req.query.state as string || null;

  if (state === null) {
    res.redirect(`${FRONTEND_URL}/login?error=state_mismatch`);
    return;
  }

  try {
    const authOptions = {
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: new URLSearchParams({
        code: code || '',
        redirect_uri: SPOTIFY_REDIRECT_URI || '',
        grant_type: 'authorization_code'
      }).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
      }
    };

    const tokenResponse = await axios(authOptions);
    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Fetch user profile from Spotify
    const userProfileResponse = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + access_token }
    });

    const spotifyUser = userProfileResponse.data;

    // Upsert user in DB
    const user = await prisma.user.upsert({
      where: { spotifyId: spotifyUser.id },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        displayName: spotifyUser.display_name,
        email: spotifyUser.email,
        avatarUrl: spotifyUser.images?.length > 0 ? spotifyUser.images[0].url : null,
      },
      create: {
        spotifyId: spotifyUser.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        displayName: spotifyUser.display_name,
        email: spotifyUser.email,
        avatarUrl: spotifyUser.images?.length > 0 ? spotifyUser.images[0].url : null,
      }
    });

    // Generate our own JWT for session
    const jwtToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

    // Set cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('Error during Spotify auth:', error);
    res.redirect(`${FRONTEND_URL}/login?error=auth_failed`);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;
