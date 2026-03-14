FROM python:3.10
RUN apt-get update && apt-get install -y ffmpeg libavformat-dev libavcodec-dev libavdevice-dev libavutil-dev libavfilter-dev libswscale-dev libswresample-dev
WORKDIR /app
COPY . /app
RUN pip install -r requirements.txt
CMD ["python", "run.py"]
