import { useState, useEffect } from 'react';

export interface RealtimeClockData {
  time: Date;
  dateFormatted: string;
  dateFormattedShort: string;
  timeFormatted: string;
  timeFormattedShort: string;
  dayName: string;
  dayNameShort: string;
  greeting: string;
  greetingDescription: string;
  period: 'pagi' | 'siang' | 'sore' | 'malam';
}

export function getGreeting(date: Date = new Date()): {
  greeting: string;
  greetingDescription: string;
  period: 'pagi' | 'siang' | 'sore' | 'malam';
} {
  const hours = date.getHours();

  if (hours >= 4 && hours < 11) {
    return {
      greeting: 'Selamat Pagi',
      greetingDescription: 'Awali hari pembelajaran dengan semangat dan dedikasi.',
      period: 'pagi'
    };
  } else if (hours >= 11 && hours < 15) {
    return {
      greeting: 'Selamat Siang',
      greetingDescription: 'Tetap produktif mengawal aktivitas belajar mengajar hari ini.',
      period: 'siang'
    };
  } else if (hours >= 15 && hours < 18) {
    return {
      greeting: 'Selamat Sore',
      greetingDescription: 'Waktu yang tepat merekap capaian dan presensi kelas hari ini.',
      period: 'sore'
    };
  } else {
    return {
      greeting: 'Selamat Malam',
      greetingDescription: 'Istirahat yang cukup untuk menyambut esok hari dengan bugar.',
      period: 'malam'
    };
  }
}

export function useRealtimeClock(): RealtimeClockData {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const daysShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const monthsShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const dayName = days[time.getDay()];
  const dayNameShort = daysShort[time.getDay()];
  const dateFormatted = `${dayName}, ${time.getDate()} ${months[time.getMonth()]} ${time.getFullYear()}`;
  const dateFormattedShort = `${dayNameShort}, ${time.getDate()} ${monthsShort[time.getMonth()]} ${time.getFullYear()}`;
  
  const hoursStr = String(time.getHours()).padStart(2, '0');
  const minutesStr = String(time.getMinutes()).padStart(2, '0');
  const secondsStr = String(time.getSeconds()).padStart(2, '0');
  const timeFormatted = `${hoursStr}:${minutesStr}:${secondsStr} WIB`;
  const timeFormattedShort = `${hoursStr}:${minutesStr} WIB`;

  const { greeting, greetingDescription, period } = getGreeting(time);

  return {
    time,
    dateFormatted,
    dateFormattedShort,
    timeFormatted,
    timeFormattedShort,
    dayName,
    dayNameShort,
    greeting,
    greetingDescription,
    period
  };
}
