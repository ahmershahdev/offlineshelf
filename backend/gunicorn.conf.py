import os

bind = "0.0.0.0:8000"
# Threads share one DB pool per process; workers * threads should stay under
# db_pool_size + db_max_overflow so requests don't queue for a connection.
workers = int(os.environ.get("GUNICORN_WORKERS", "2"))
threads = int(os.environ.get("GUNICORN_THREADS", "4"))
worker_class = "gthread"
timeout = 30
graceful_timeout = 20
keepalive = 5
max_requests = 2000
max_requests_jitter = 200
limit_request_line = 4094
limit_request_fields = 50
limit_request_field_size = 8190
forwarded_allow_ips = "*"
accesslog = "-"
errorlog = "-"
