/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { format, parseISO, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";

export const formatDayOfWeek = (date: Date) => {
  return format(date, "EEEE", { locale: vi });
};

export const formatDisplayDate = (date: Date) => {
  return format(date, "dd/MM/yyyy");
};

// Common Vietnamese Holidays (Solar)
export const DEFAULT_SOLAR_HOLIDAYS = [
  { date: "01-01", name: "Tết Dương lịch" },
  { date: "30-04", name: "Ngày Giải phóng miền Nam" },
  { date: "01-05", name: "Ngày Quốc tế Lao động" },
  { date: "02-09", name: "Ngày Quốc khánh" },
];

// For Lunar holidays, we usually need a library. 
// For this demo, I'll pre-calculate some for 2024-2026 or just allow users to add them.
// I'll provide a few for 2024/2025 as examples.
export const EXAMPLE_LUNAR_HOLIDAYS = [
  { date: "2024-02-10", name: "Tết Nguyên Đán (Mùng 1)" },
  { date: "2024-02-11", name: "Tết Nguyên Đán (Mùng 2)" },
  { date: "2024-02-12", name: "Tết Nguyên Đán (Mùng 3)" },
  { date: "2024-04-18", name: "Giỗ tổ Hùng Vương" },
  { date: "2025-01-29", name: "Tết Nguyên Đán (Mùng 1)" },
  { date: "2025-01-30", name: "Tết Nguyên Đán (Mùng 2)" },
  { date: "2025-01-31", name: "Tết Nguyên Đán (Mùng 3)" },
  { date: "2025-04-07", name: "Giỗ tổ Hùng Vương" },
];
