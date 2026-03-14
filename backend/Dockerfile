FROM python:3.10

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
EXPOSE 8000
CMD ["gunicorn", "run:app", "--bind", "0.0.0.0:8000", "--worker-class", "gthread", "--threads", "4", "--workers", "1", "--timeout", "180"]
=======
EXPOSE 8000

CMD ["gunicorn", "run:app", "--bind", "0.0.0.0:8000", "--worker-class", "gthread", "--threads", "4", "--workers", "1", "--timeout", "180"]
>>>>>>> origin/tomas_branch
