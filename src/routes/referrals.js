const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabase');
const authMiddleware = require('../middlewares/auth');



router.get('/referral', authMiddleware, async (req, res) => {
  const link = `https://alphawolf.click?ref=${req.userId}`;
  res.json({ link });
});

// Add auth middleware to POST /invite
router.post('/invite', authMiddleware, async (req, res) => {
    const referrerId = req.userId; // Get from auth
    const { refereeId } = req.body;
    
    // Add validation
    if (!refereeId) return res.status(400).json({ error: 'Missing referee ID' });
  
});

module.exports = router;