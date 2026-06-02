FROM python:3.11-slim
WORKDIR /app
COPY payment-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY payment-service/razorpay_core.py payment-service/main.py ./
COPY shared ./shared
ENV PYTHONPATH=/app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8103"]
