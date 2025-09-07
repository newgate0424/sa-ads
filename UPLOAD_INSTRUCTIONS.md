# วิธีการ Upload โค้ดขึ้น GitHub

เนื่องจาก Git ยังไม่ได้ติดตั้งในระบบ มีวิธีการ upload ได้ 2 แบบ:

## วิธีที่ 1: ใช้ GitHub Desktop (แนะนำสำหรับผู้เริ่มต้น)

1. **ดาวน์โหลด GitHub Desktop:**
   - ไปที่ https://desktop.github.com/
   - ดาวน์โหลดและติดตั้ง

2. **เข้าสู่ระบบ GitHub:**
   - เปิด GitHub Desktop
   - เข้าสู่ระบบด้วยบัญชี GitHub ของคุณ

3. **สร้าง Repository ใหม่:**
   - คลิก "Add" → "Create new repository"
   - ชื่อ repository: `sa-ads`
   - Local path: `C:\Users\user\Downloads\sa-ads-main\sa-ads-main`
   - เลือก "Initialize this repository with a README"

4. **Publish to GitHub:**
   - คลิก "Publish repository"
   - ตั้งชื่อ: `sa-ads`
   - เลือก "Keep this code private" หากต้องการ private repo
   - คลิก "Publish repository"

## วิธีที่ 2: ติดตั้ง Git Command Line

1. **ดาวน์โหลด Git:**
   - ไปที่ https://git-scm.com/download/win
   - ดาวน์โหลดและติดตั้ง Git for Windows

2. **รีสตาร์ท PowerShell หรือ VS Code**

3. **รัน PowerShell Script:**
   ```powershell
   .\upload-to-github.ps1
   ```

## วิธีที่ 3: Upload ผ่าน GitHub Web Interface

1. **สร้าง Repository ใหม่:**
   - ไปที่ https://github.com/newgate0424
   - คลิก "New repository"
   - ชื่อ: `sa-ads`
   - เลือก Private หากต้องการ

2. **Upload Files:**
   - คลิก "uploading an existing file"
   - เลือกและลากไฟล์ทั้งหมดยกเว้น:
     - `.env.local` (ข้อมูลลับ)
     - `node_modules/` (dependencies)
     - `.next/` (build files)

## หมายเหตุ:
- อย่า upload ไฟล์ `.env.local` เพราะมีข้อมูลฐานข้อมูลลับ
- ไฟล์ `.env.example` ได้สร้างไว้แล้วเพื่อแนะนำการตั้งค่า
- README.md ได้อัพเดทข้อมูลโปรเจคแล้ว

Repository URL จะเป็น: https://github.com/newgate0424/sa-ads
