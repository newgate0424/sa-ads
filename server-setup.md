# Server Setup Guide

## แก้ไขปัญหา Node.js และ npm install

### ปัญหาที่พบ:
```
npm error nodenv: node: command not found
npm error command failed (bcrypt compilation)
```

### วิธีแก้ไข:

## 1. ตั้งค่า Node.js version ผ่าน nodenv

```bash
# เช็ค Node.js versions ที่มี
nodenv versions

# ตั้งค่า global version (แนะนำ version 20)
nodenv global 20

# หรือตั้งค่าเฉพาะโปรเจค
nodenv local 20

# Refresh nodenv
nodenv rehash

# ตรวจสอบ
node --version
npm --version
```

## 2. เคลียร์ cache และติดตั้งใหม่

```bash
# ลบ node_modules และ package-lock.json
rm -rf node_modules
rm -f package-lock.json

# เคลียร์ npm cache
npm cache clean --force

# ติดตั้งใหม่
npm install
```

## 3. หากยังมีปัญหา ใช้ yarn แทน npm

```bash
# ติดตั้ง yarn
npm install -g yarn

# ติดตั้งด้วย yarn
yarn install
```

## 4. Alternative: ใช้ Docker

สร้างไฟล์ `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 5. Environment Variables บนเซิร์ฟเวอร์

ตั้งค่าในไฟล์ `.env.local` หรือผ่าน hosting panel:

```env
DATABASE_URL="mysql://username:password@host:port/database"
NEXTAUTH_SECRET="generate-new-secret-key"
NEXTAUTH_URL=https://yourdomain.com
```

## คำสั่งทำตามลำดับ:

```bash
# 1. ตั้งค่า Node.js
nodenv global 20
nodenv rehash

# 2. เคลียร์และติดตั้งใหม่
rm -rf node_modules package-lock.json .next
npm cache clean --force
npm install

# 3. Build
npm run build

# 4. Start
npm start
```

## หมายเหตุ:
- ใช้ Node.js version 18, 20, หรือ 22
- หลีกเลี่ยง native binary packages เมื่อเป็นไปได้
- ใช้ bcryptjs แทน bcrypt สำหรับความเสถียร
