const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);

client.on('error', (err) => console.error('Redis Error:', err));

module.exports = {
  get: (key) => new Promise((resolve, reject) => {
    client.get(key, (err, data) => (err ? reject(err) : resolve(data)));
  }),
  set: (key, value, ttl = 3600) => client.setex(key, ttl, value),
};