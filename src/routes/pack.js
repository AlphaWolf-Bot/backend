const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const authMiddleware = require('../middlewares/auth');

router.get('/level', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('level')
      .eq('telegram_id', req.userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;