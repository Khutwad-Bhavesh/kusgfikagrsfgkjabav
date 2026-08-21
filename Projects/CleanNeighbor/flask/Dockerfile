# Use Python 3.11 slim image
FROM python:3.11-slim

WORKDIR /app

# Upgrade pip first
RUN pip install --upgrade pip setuptools wheel

# Copy requirements first (leverage caching)
COPY requirements.txt .

# Install requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Run gunicorn on startup.
# Railway provides the PORT environment variable dynamically.
CMD gunicorn combined_server:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
