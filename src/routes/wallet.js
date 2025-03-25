// ... (previous imports)
const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const authMiddleware = require('../middlewares/auth');
const cache = require('../utils/cache');

router.post('/tap', authMiddleware, async (req, res) => {
  const cacheKey = `user:${req.userId}`;
  const cachedUser = await cache.get(cacheKey);
  let user = cachedUser ? JSON.parse(cachedUser) : null;

  if (!user) {
    const { data } = await supabase
      .from('users')
      .select('taps_today, last_tap_date, coins')
      .eq('telegram_id', req.userId)
      .single();
    user = data;
  }

  const today = new Date().toISOString().split('T')[0];
  if (!user.last_tap_date || user.last_tap_date !== today) {
    await supabase
      .from('users')
      .update({ taps_today: 0, last_tap_date: today })
      .eq('telegram_id', req.userId);
    user.taps_today = 0;
  }

  if (user.taps_today >= 100) {
    return res.status(400).json({ error: 'Daily tap limit reached' });
  }

  user.taps_today += 1;
  user.coins = (user.coins || 0) + 1;

  await supabase
    .from('users')
    .update({ taps_today: user.taps_today, coins: user.coins })
    .eq('telegram_id', req.userId);

  await cache.set(cacheKey, JSON.stringify(user));
  res.json({ success: true, coins: user.coins });
});

module.exports = router;