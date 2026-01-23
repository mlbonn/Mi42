#!/bin/bash

# Kill any process on port 3000
PORT_PID=$(lsof -t -i:3000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
  echo "Killing process on port 3000: $PORT_PID"
  kill -9 $PORT_PID
  sleep 2
fi

# Start server
cd /home/manus02/friday-crm
node dist/_core/index.js
