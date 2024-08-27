# Node Assignment: User Task Queuing with Rate Limiting
## Overview
This Node.js project implements an API that handles user tasks with rate limiting and queuing mechanisms. The system ensures that no more than one task is processed per second and no more than 20 tasks are processed per minute for each user. Any tasks exceeding the rate limit are queued and processed in sequence, ensuring that no requests are dropped.

## Features
``` Rate Limiting: Each user ID is limited to one task per second and 20 tasks per minute.
Task Queuing: Tasks exceeding the rate limit are queued and processed in the order they were received.
Logging: Each task completion is logged with the user ID and a timestamp in a log file (task.log).
Resiliency: The API is designed to handle failures gracefully and process tasks without losing any data.
```
Project Structure
```

.
├── app.js             # Main application file
├── task.log           # Log file for completed tasks
├── package.json       # Node.js dependencies and scripts
└── README.md          # Project documentation
```
## Requirements
```
Node.js
Redis (used for managing the rate limiter across multiple instances)
Redis server running on localhost at port 6379
```
## Installation
Clone the repository:

```
git clone <repository-url>
cd <repository-directory>
```
## Install dependencies:

```
npm install
Start Redis server: Ensure you have Redis installed and running on your local machine.
```

## Run the application:


node app.js
API Endpoints
POST /task
Description: Processes a task for a given user ID. If the rate limit is exceeded, the task is queued for later execution.
Request Body:
json
Copy code
{
  "user_id": "123"
}
```
Response:
200 OK: Task completed successfully.
429 Too Many Requests: Task queued due to rate limit exceeded.
```

## Testing
You can test the API using tools like Postman or curl.
### curl : 
```
curl -X POST http://localhost:3002/task -H "Content-Type: application/json" -d '{"user_id":"123"}'
```

