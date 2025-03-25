const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');

router.post('/telegram', async (req, res) => {
    try {
      const { initData } = req.body;
      // Add proper Telegram validation here
      const user = validateTelegramData(initData);

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    const { data: newUser } = await supabase
      .from('users')
      .insert([{ telegram_id: user.id, username: user.username }])
      .select()
      .single();
    return res.json(newUser);
  }
  res.json(data);

} catch (err) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

module.exports = router;