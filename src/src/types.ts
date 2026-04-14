/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "ADMIN" | "NURSE";

export interface Staff {
  id: string;
  name: string;
  code: string;
  department: string;
  phone?: string;
  email?: string;
  role: UserRole;
  password?: string; // For mock auth
  status: "ACTIVE" | "LOCKED";
  targetShifts?: number;
  notes?: string;
  availableDays?: number[]; // 0-6 for Sun-Sat
  unavailableDays?: number[]; // 0-6 for Sun-Sat
}

export interface ShiftAssignment {
  staffId: string;
}

export interface Shift {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  assignments: ShiftAssignment[];
}

export interface Holiday {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  name: string;
  isLunar: boolean;
  lunarDate?: string; // e.g., "10/03"
  note?: string;
}

export interface LeaveRequest {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "SCHEDULE_UPDATE" | "REMINDER" | "SYSTEM";
  read: boolean;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  type: "INFO" | "WARNING" | "URGENT";
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string; // "ALL" for group chat
  content: string;
  createdAt: string;
}

export interface UserSettings {
  emailNotifications: boolean;
  appNotifications: boolean;
  reminderFrequency: "1_HOUR" | "1_DAY" | "NONE";
}

export interface AppData {
  staff: Staff[];
  shifts: Shift[];
  holidays: Holiday[];
  leaveRequests: LeaveRequest[];
  notifications: Notification[];
  announcements: Announcement[];
  messages: Message[];
  currentUser: Staff | null;
  settings: Record<string, UserSettings>; // userId -> settings
  config: {
    nursesPerDay: number;
  };
}
