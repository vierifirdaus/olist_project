#!/usr/bin/env bash
set -euo pipefail

# Jalankan extract job di cluster spark docker
docker compose exec spark-master bash -lc '
/opt/bitnami/spark/bin/spark-submit \
  --master spark://spark-master:7077 \
  --name extract_to_bronze \
  /opt/spark/jobs/extract_to_bronze.py
'
