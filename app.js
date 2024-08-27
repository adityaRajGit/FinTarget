const express = require('express');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const redis = require('redis');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
app.use(express.json());

// Set up Redis client
const redisClient = redis.createClient({
  host: 'localhost', // Redis server hostname
  port: 6379,        // Redis server port
  enable_offline_queue: false
});

// Handle Redis client errors
redisClient.on('error', (err) => console.error('Redis Client Error', err));

// Open Redis connection
redisClient.connect().catch(err => console.error('Redis Client Connection Error', err));

// File path for logging
const logFilePath = path.join(__dirname, 'task.log');

// Task function that logs completion to a file
async function task(user_id) {
  const logEntry = `${user_id} - task completed at ${new Date().toISOString()}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Error writing to log file', err);
  });
}

// Rate limiter configuration using Redis for shared state across clusters
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 20,      // 20 tasks per minute
  duration: 60,    // Per minute
  blockDuration: 1 // 1 second block per task
});

const taskQueue = {};

// Function to process tasks in the queue
async function processQueue(user_id) {
  if (taskQueue[user_id] && taskQueue[user_id].length > 0) {
    const nextTask = taskQueue[user_id].shift();
    try {
      await rateLimiter.consume(user_id, 1); // Attempt to consume a point
      await task(nextTask.user_id);          // Process the task
      console.log(`${nextTask.user_id} - task processed from queue`);
    } catch (err) {
      console.error('Error processing task from queue', err);
      taskQueue[user_id].unshift(nextTask); // Retry if rate limit exceeded
    } finally {
      processQueue(user_id); // Continue processing the queue
    }
  }
}

// Route to handle tasks
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
  processQueue(user_id); // Start processing the queue for this user_id
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
