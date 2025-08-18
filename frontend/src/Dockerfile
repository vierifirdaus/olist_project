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

# Expose port yang digunakan oleh aplikasi
EXPOSE 3000

# Perintah untuk menjalankan aplikasi dalam mode development
CMD [ "npm", "run", "dev" ]