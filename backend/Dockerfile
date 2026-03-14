FROM python:3.10

# Cache bust: v2
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libavformat-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavutil-dev \
    libavfilter-dev \
    libswscale-dev \
    libswresample-dev

WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt

CMD ["sh", "-c", "echo PORT is $PORT; gunicorn --bind 0.0.0.0:${PORT:-8000} run:app"]