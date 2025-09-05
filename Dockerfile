# Django Backend Dockerfile for Railway
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY vridge_back/requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Copy project files
COPY vridge_back /app

# Copy my_settings.py if it exists
COPY vridge_back/my_settings.py /app/my_settings.py

# Create staticfiles directory
RUN mkdir -p /app/staticfiles

# Run Django commands and start server
CMD python manage.py collectstatic --noinput && \
    python manage.py migrate --noinput && \
    daphne -b 0.0.0.0 -p $PORT config.asgi:application