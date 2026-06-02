FROM python:3.11-slim
WORKDIR /app
COPY integration-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY integration-service/moodle.py integration-service/main.py ./
COPY shared ./shared
ENV PYTHONPATH=/app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8101"]
