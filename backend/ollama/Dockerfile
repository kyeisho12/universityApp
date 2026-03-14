# Ollama Dockerfile for Railway (CPU-only)
# This Dockerfile installs Ollama and pulls the phi3 model

FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | bash

# Expose Ollama API port
EXPOSE 11434

# Pull phi3 model on build (optional, can be done at runtime)
RUN ollama pull phi3:mini || true

# Start Ollama server
CMD ["ollama", "serve"]
