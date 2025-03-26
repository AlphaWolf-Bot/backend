const express = require('express');
const { supabase } = require('../utils/supabase');
const cache = require('../utils/cache');
const router = express.Router();

// Simulated auth middleware (replace with real Telegram auth later)
const authMiddleware = async (req, res, next) => {
  req.userId = '12345'; // Temporary for testing
  next();
};

router.post('/tap', authMiddleware, async (req, res) => {
  try {
    const cacheKey = `user:${req.userId}`;
    let user = null;

    // Check cache first
    const cachedUser = await cache.get(cacheKey);
    if (cachedUser) {
      user = JSON.parse(cachedUser);
    }

    // If not in cache, fetch from Supabase
    if (!user) {
      const { data } = await supabase
        .from('users')
        .select('taps_today, last_tap_date, coins')
        .eq('telegram_id', req.userId)
        .single();

      user = data || { taps_today: 0, last_tap_date: null, coins: 0 }; // Default if no user
      await cache.set(cacheKey, JSON.stringify(user));
    }

    const today = new Date().toISOString().split('T')[0];
    if (!user.last_tap_date || user.last_tap_date !== today) {
      user.taps_today = 0;
      user.last_tap_date = today;
    }

    if (user.taps_today >= 100) {
      return res.status(400).json({ error: 'Daily tap limit reached' });
    }

    user.taps_today += 1;
    user.coins = (user.coins || 0) + 1;

    // Update Supabase and cache
    await supabase
      .from('users')
      .upsert({ telegram_id: req.userId, ...user });
    await cache.set(cacheKey, JSON.stringify(user));

    res.json({ success: true, coins: user.coins });
  } catch (error) {
    console.error('Tap error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;