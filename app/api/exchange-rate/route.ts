// File: app/api/exchange-rate/route.ts

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// --- In-memory Cache ---
let cachedRate: {
  rate: number;
  timestamp: number;
  isFallback: boolean;
} | null = null;

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 นาที

export async function GET() {
  const now = Date.now();

  // 1. ตรวจสอบ Cache ก่อน
  if (cachedRate && (now - cachedRate.timestamp < CACHE_DURATION_MS)) {
    console.log("Returning exchange rate from cache.");
    return NextResponse.json({ 
      rate: cachedRate.rate, 
      isFallback: cachedRate.isFallback 
    });
  }

  console.log("Cache expired or empty. Fetching new exchange rate.");

  // 2. ถ้า Cache หมดอายุหรือไม่มี ให้ดึงข้อมูลใหม่
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiKey) {
    console.error('Exchange Rate API key is missing.');
    // Cache ค่าสำรองไว้ด้วย
    cachedRate = { rate: 36.5, timestamp: now, isFallback: true };
    return NextResponse.json({ rate: 36.5, isFallback: true });
  }

  const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;

  try {
    const response = await fetch(apiUrl, {
      // ไม่ใช้ cache ของ Next.js แต่จะจัดการเอง
      cache: 'no-store', 
    });

    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (data.result === 'success' && data.conversion_rates?.THB) {
      const newRate = data.conversion_rates.THB;
      // อัปเดต Cache ด้วยข้อมูลใหม่
      cachedRate = { rate: newRate, timestamp: now, isFallback: false };
      return NextResponse.json({ rate: newRate, isFallback: false });
    } else {
      throw new Error('Invalid data structure from API');
    }
  } catch (error) {
    console.error('Failed to fetch new exchange rate, using fallback.', error);
    // หากเกิดข้อผิดพลาด, อัปเดต Cache เป็นค่าสำรอง
    cachedRate = { rate: 36.5, timestamp: now, isFallback: true };
    return NextResponse.json({ rate: 36.5, isFallback: true });
  }
}