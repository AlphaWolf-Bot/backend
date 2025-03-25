const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.use(async (req, res, next) => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('telegram_id', req.userId)
      .single();
  
    if (data?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  });

router.get('/social-links', async (req, res) => {
  const { data } = await supabase.from('social_links').select('*');
  res.json(data);
});

router.post('/social-links', authMiddleware, async (req, res) => {
  const { name, url } = req.body;
  // Add admin check in production
  const { data } = await supabase.from('social_links').insert([{ name, url }]);
  res.json(data);
});

router.get('/last-claim', authMiddleware, async (req, res) => {
  const { data } = await supabase
    .from('claims')
    .select('created_at')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  res.json({ lastClaim: data?.created_at });
});

router.post('/claim-reward', authMiddleware, async (req, res) => {
  const { linkId } = req.body;
  await supabase.from('claims').insert([{ user_id: req.userId, link_id: linkId }]);
  await supabase.rpc('increment_coins', { user_id: req.userId, amount: 50 });
  res.json({ success: true });
});

module.exports = router;