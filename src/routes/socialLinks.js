const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const authMiddleware = require('../middlewares/auth');
const cache = require('../utils/cache');

const adminMiddleware = async (req, res, next) => {
    // Add error handling
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('telegram_id', req.userId)
        .single();
  
      if (error || !data || data.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
  router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data } = await supabase.from('social_links').select('*');
  res.json(data);
});

router.post('/', adminMiddleware, async (req, res) => {
    const { data, error } = await supabase
      .from('social_links')
      .insert([{ name, url }])
      .select()
      .single();
    if (error) return res.status(400).json({ error });
    res.json(data);
  });
  

  router.delete('/:id', adminMiddleware, async (req, res) => {
  await supabase.from('social_links').delete().eq('id', req.params.id);
  res.json({ success: true });
});

module.exports = router;