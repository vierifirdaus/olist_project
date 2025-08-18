# gunakan Node LTS terbaru yang mendukung crypto.hash
FROM node:22-alpine

WORKDIR /app

# copy lockfile agar install reproducible (pakai yang sesuai: package-lock/pnpm-lock/yarn.lock)
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

RUN npm ci --ignore-scripts

# copy sisa source
COPY . .
ENV VITE_API_URL=http://212.85.26.216:5002/api
EXPOSE 5173

# paksa vite host terbuka di container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
