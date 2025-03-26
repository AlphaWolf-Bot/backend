const express = require('express');
const { supabase } = require('../utils/supabase');
const cache = require('../utils/cache');
const router = express.Router();
const crypto = require('crypto');
const { parse } = require('querystring');

// Middleware to authenticate Telegram user using initData
const authMiddleware = async (req, res, next) => {
  // Extract initData from request headers
  const initData = req.headers['x-telegram-init-data'];
  if (!initData) {
    return res.status(401).json({ error: 'Unauthorized: Missing initData' });
  }

  try {
    // Parse URL-encoded initData into key-value pairs
    const parsedData = parse(initData);
    const { hash, ...data } = parsedData;

    // Create data check string by sorting keys alphabetically
    const dataCheckString = Object.keys(data)
      .sort()
      .map(key => `${key}=${data[key]}`)
      .join('\n');

    // Generate secret key using bot token
    const secretKey = crypto.createHmac('sha256', 'WebAppData')
      .update(process.env.TELEGRAM_BOT_TOKEN)
      .digest();

    // Compute hash for verification
    const computedHash = crypto.createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Verify the hash
    if (computedHash !== hash) {
      return res.status(401).json({ error: 'Unauthorized: Invalid hash' });
    }

    // Extract user info from initData
    const user = JSON.parse(data.user);
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    // Set userId as a string (assuming telegram_id is stored as string in Supabase)
    req.userId = user.id.toString();
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid initData' });
  }
};

// Route to handle tap action
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
      const { data, error } = await supabase
        .from('users')
        .select('taps_today, last_tap_date, coins')
        .eq('telegram_id', req.userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Supabase fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch user data' });
      }

      // If user doesn't exist, create a new one
      user = data || { telegram_id: req.userId, taps_today: 0, last_tap_date: null, coins: 0 };
      if (!data) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([user]);

        if (insertError) {
          console.error('Supabase insert error:', insertError);
          return res.status(500).json({ error: 'Failed to create user' });
        }
      }

      await cache.set(cacheKey, JSON.stringify(user));
    }

    // Check daily tap limit
    const today = new Date().toISOString().split('T')[0];
    if (!user.last_tap_date || user.last_tap_date !== today) {
      user.taps_today = 0;
      user.last_tap_date = today;
    }

    if (user.taps_today >= 100) {
      return res.status(400).json({ error: 'Daily tap limit reached' });
    }

    // Update tap count and coins
    user.taps_today += 1;
    user.coins = (user.coins || 0) + 1;

    // Update user in Supabase
    const { error: updateError } = await supabase
      .from('users')
      .update({
        taps_today: user.taps_today,
        last_tap_date: user.last_tap_date,
        coins: user.coins,
      })
      .eq('telegram_id', req.userId);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return res.status(500).json({ error: 'Failed to update user data' });
    }

    // Update cache
    await cache.set(cacheKey, JSON.stringify(user));

    // Send response
    res.json({ success: true, coins: user.coins });
  } catch (error) {
    console.error('Unexpected error in /tap route:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
