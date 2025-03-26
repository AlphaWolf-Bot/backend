const redis = require('redis');
require('dotenv').config(); // Ensure .env is loaded

console.log('REDIS_URL from env:', process.env.REDIS_URL); // Debug line

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379', // Fallback
});

client.on('connect', () => console.log('Connected to Redis'));
client.on('error', (err) => console.error('Redis Error:', err));
client.on('ready', () => console.log('Redis client ready'));
client.on('end', () => console.log('Redis connection closed'));

// Connect to Redis
(async () => {
  try {
    await client.connect();
    console.log('Redis connection established');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

module.exports = {
  get: async (key) => {
    try {
      return await client.get(key);
    } catch (err) {
      console.error('Redis GET error:', err);
      throw err;
    }
  },
  set: async (key, value, ttl = 3600) => {
    try {
      await client.setEx(key, ttl, value);
    } catch (err) {
      console.error('Redis SET error:', err);
      throw err;
    }
  },
  ping: async () => {
    try {
      return await client.ping();
    } catch (err) {
      console.error('Redis PING error:', err);
      throw err;
    }
  },
};