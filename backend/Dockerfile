# Gunakan base image Node.js
FROM node:18-alpine

# Atur direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin package.json dan package-lock.json
COPY package*.json ./

# Instal dependensi
RUN npm install

# Salin sisa kode aplikasi
COPY . .
# Build kode TypeScript menjadi JavaScript
RUN npm run build

# Expose port yang digunakan oleh aplikasi
EXPOSE 8000

# Perintah untuk menjalankan aplikasi
CMD [ "node", "dist/server.js" ]