# Deployment Guide

## การแก้ไขปัญหา Build Error ในเซิร์ฟเวอร์

หากเจอปัญหา "parallel pages" error บนเซิร์ฟเวอร์:

### 1. ลบ Cache ทั้งหมด
```bash
# ลบ .next folder และ node_modules
rm -rf .next
rm -rf node_modules

# ติดตั้ง dependencies ใหม่
npm install
```

### 2. ตรวจสอบโครงสร้างไฟล์
ให้แน่ใจว่าไม่มี:
- `/app/register/page.tsx` (ต้องไม่มี)
- มีเฉพาะ `/app/(auth)/register/page.tsx` เท่านั้น

### 3. Build และ Deploy
```bash
npm run build
npm start
```

## สำหรับ Vercel Deployment

### Environment Variables ที่ต้องตั้งค่า:
1. `DATABASE_URL` - MySQL connection string
2. `NEXTAUTH_SECRET` - สุ่ม secret key ใหม่
3. `NEXTAUTH_URL` - URL ของเว็บไซต์

### Commands สำหรับ Vercel:
```bash
# Install
npm install

# Build  
npm run build

# Start
npm start
```

## การแก้ไขปัญหา Router Conflicts

1. **ลบ cache:**
   ```bash
   rm -rf .next
   ```

2. **ตรวจสอบ duplicate routes:**
   ```bash
   find . -name "*register*" -type f | grep -v node_modules | grep -v .next
   ```

3. **Rebuild:**
   ```bash
   npm run build
   ```

## หมายเหตุ:
- ต้องตั้งค่า Environment Variables บนเซิร์ฟเวอร์ก่อน deploy
- ห้าม commit ไฟล์ `.env.local` ขึ้น repository
- ใช้ `.env.example` เป็นแนวทางการตั้งค่า
