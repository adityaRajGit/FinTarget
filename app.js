const express = require('express');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Set up Redis client
const redisClient = redis.createClient({
  host: 'localhost', 
  port: 6379,        
  enable_offline_queue: false
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

redisClient.connect().catch(err => console.error('Redis Client Connection Error', err));

const logFilePath = path.join(__dirname, 'task.log');

async function task(user_id) {
  const logEntry = `${user_id} - task completed at ${new Date().toISOString()}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Error writing to log file', err);
  });
}

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 20,      
  duration: 60,    
  blockDuration: 1 
});

const taskQueue = {};

async function processQueue(user_id) {
  if (taskQueue[user_id] && taskQueue[user_id].length > 0) {
    const nextTask = taskQueue[user_id].shift();
    try {
      await rateLimiter.consume(user_id, 1); 
      await task(nextTask.user_id);          
      console.log(`${nextTask.user_id} - task processed from queue`);
    } catch (err) {
      console.error('Error processing task from queue', err);
      taskQueue[user_id].unshift(nextTask); 
    } finally {
      processQueue(user_id); 
    }
  }
}

app.post('/task', async (req, res) => {
  const { user_id } = req.body;

  try {
    await rateLimiter.consume(user_id, 1); // 1 task per second
    await task(user_id);
    res.status(200).send('Task completed');
  } catch (rejRes) {
    if (!taskQueue[user_id]) {
      taskQueue[user_id] = [];
    }
    taskQueue[user_id].push(req.body);
    res.status(429).send('Task queued due to rate limit');
  }
  processQueue(user_id); 
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
