import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
       res.status(401).json({ error: 'User not found' });
       return;
    }
    const { accessToken, refreshToken, ...publicUser } = req.user;
    res.json(publicUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
