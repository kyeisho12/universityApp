# Ollama Dockerfile for Railway (CPU-only)
# Starts Ollama, pulls phi3.5:mini at runtime, then keeps serving

FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && \
    apt-get install -y curl gnupg zstd && \
    rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | bash

# Copy startup script
COPY backend/ollama/start.sh /start.sh
RUN chmod +x /start.sh

# Expose Ollama API port
EXPOSE 11434

# Run startup script (starts daemon, pulls model, then keeps serving)
CMD ["/start.sh"]
