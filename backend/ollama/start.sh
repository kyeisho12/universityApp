#!/bin/bash
# Start Ollama server in background, pull model, then wait

export OLLAMA_HOST=0.0.0.0:11434

# Start Ollama in the background
ollama serve &
OLLAMA_PID=$!

# Wait until Ollama is ready
echo "Waiting for Ollama to start..."
until curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; do
  sleep 2
done
echo "Ollama is ready. Pulling phi3.5..."

# Pull the model
ollama pull phi3.5

echo "Model ready. Ollama serving on 0.0.0.0:11434"

# Keep the process alive
wait $OLLAMA_PID
