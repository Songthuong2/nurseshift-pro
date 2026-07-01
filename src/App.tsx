/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Staff, Shift, Holiday, AppData, ShiftAssignment, LeaveRequest, Notification, Announcement, UserSettings, Message } from "@/src/types";
import StaffManagement from "@/src/components/StaffManagement";
import ShiftScheduler from "@/src/components/ShiftScheduler";
import HolidayManagement from "@/src/components/HolidayManagement";
import SummaryDashboard from "@/src/components/SummaryDashboard";
import LeaveRequestManagement from "@/src/components/LeaveRequestManagement";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import NotificationCenter from "@/src/components/NotificationCenter";
import PersonalSchedule from "@/src/components/PersonalSchedule";
import Chat from "@/src/components/Chat";
import Login from "@/src/components/Login";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Users, CalendarDays, Palmtree, Stethoscope, Clock, Bell, LogOut, UserCircle, ClipboardList, Moon, Sun, Cloud, CloudOff, RefreshCw, MessageSquare, Key, Mail, Trash2, Check, X, AlertTriangle, Info, Megaphone } from "lucide-react";
import { EXAMPLE_LUNAR_HOLIDAYS, DEFAULT_SOLAR_HOLIDAYS } from "@/src/lib/date-utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabaseService } from "@/src/services/supabaseService";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title="Chế độ nền"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Chuyển đổi giao diện</span>
    </Button>
  );
}

const STORAGE_KEY = "nursing_shift_app_data_v2";

const formatDateStr = (dateStr: string) => {
  if (!dateStr) return "";
  try {
    const match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
};

const formatAllDatesInText = (text: string) => {
  if (!text) return "";
  return text.replace(/(\d{4})-(\d{2})-(\d{2})/g, (match, y, m, d) => {
    return `${d}/${m}/${y}`;
  });
};

export default function App() {
  const { theme } = useTheme();
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        staff: parsed.staff || [],
        shifts: parsed.shifts || [],
        holidays: parsed.holidays || [],
        leaveRequests: parsed.leaveRequests || [],
        notifications: parsed.notifications || [],
        announcements: parsed.announcements || [],
        messages: parsed.messages || [],
        currentUser: parsed.currentUser || null,
        settings: parsed.settings || {},
        config: parsed.config || { nursesPerDay: 3 }
      };
    }

    return {
      staff: [],
      shifts: [],
      holidays: [],
      leaveRequests: [],
      notifications: [],
      announcements: [],
      messages: [],
      currentUser: null,
      settings: {},
      config: { nursesPerDay: 3 }
    };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(isSupabaseConfigured);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const hasLoadedCloud = useRef(false);
  const prevNotificationsRef = useRef<string[]>([]);
  const isLoadedRef = useRef(false);
  const prevMessagesRef = useRef<string[]>([]);
  const isMessagesLoadedRef = useRef(false);
  const lastLocalChangeRef = useRef<number>(0);
  const isSyncingFromCloudRef = useRef<boolean>(false);
  const seenUnifiedIdsRef = useRef<string[]>([]);
  const isUnifiedLoadedRef = useRef<boolean>(false);

  const currentUser = data.currentUser;
  const isAdmin = currentUser?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<string>(() => {
    return isAdmin ? "summary" : "shifts";
  });
  const [activeChatRecipientId, setActiveChatRecipientId] = useState<string>("ALL");
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [notificationCenterSubTab, setNotificationCenterSubTab] = useState<"announcements" | "personal">("announcements");
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const [readMessageIds, setReadMessageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("read_message_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("read_announcement_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dismissed_announcement_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep them synced to localStorage
  useEffect(() => {
    localStorage.setItem("read_message_ids", JSON.stringify(readMessageIds));
  }, [readMessageIds]);

  useEffect(() => {
    localStorage.setItem("read_announcement_ids", JSON.stringify(readAnnouncementIds));
  }, [readAnnouncementIds]);

  useEffect(() => {
    localStorage.setItem("dismissed_announcement_ids", JSON.stringify(dismissedAnnouncementIds));
  }, [dismissedAnnouncementIds]);

  const handleDeleteNotification = (id: string) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== id)
    }));
    toast.success("Đã xóa thông báo");
  };

  const unifiedNotifications = useMemo(() => {
    if (!currentUser) return [];

    const items: {
      id: string;
      source: "notification" | "message" | "announcement";
      title: string;
      message: string;
      createdAt: string;
      read: boolean;
      type?: string;
      senderId?: string;
      senderName?: string;
      authorName?: string;
    }[] = [];

    // 1. Personal notifications (Schedule updates / Reminders / System)
    const personal = data.notifications.filter(n => n.userId === currentUser.id);
    personal.forEach(n => {
      items.push({
        id: n.id,
        source: "notification",
        title: n.title,
        message: formatAllDatesInText(n.message),
        createdAt: n.createdAt,
        read: n.read,
        type: n.type
      });
    });

    // 2. Chat messages received by current user (excluding own sent messages)
    const messages = (data.messages || []).filter(
      m => m.senderId !== currentUser.id && (m.receiverId === currentUser.id || m.receiverId === "ALL")
    );
    messages.forEach(m => {
      items.push({
        id: m.id,
        source: "message",
        title: m.receiverId === "ALL" ? `💬 Tin nhắn nhóm y tế` : `💬 Tin nhắn từ ${m.senderName}`,
        message: formatAllDatesInText(m.content),
        createdAt: m.createdAt,
        read: readMessageIds.includes(m.id),
        senderId: m.senderId,
        senderName: m.senderName
      });
    });

    // 3. Public Announcements (excluding dismissed ones)
    const activeAnnouncements = data.announcements.filter(a => !dismissedAnnouncementIds.includes(a.id));
    activeAnnouncements.forEach(a => {
      items.push({
        id: a.id,
        source: "announcement",
        title: `📢 ${a.title}`,
        message: formatAllDatesInText(a.content),
        createdAt: a.createdAt,
        read: readAnnouncementIds.includes(a.id),
        authorName: a.authorName,
        type: a.type
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [data.notifications, data.messages, data.announcements, currentUser, readMessageIds, readAnnouncementIds, dismissedAnnouncementIds]);

  const totalUnreadCount = useMemo(() => {
    return unifiedNotifications.filter(item => !item.read).length;
  }, [unifiedNotifications]);

  const handleMarkItemAsRead = (item: typeof unifiedNotifications[0]) => {
    if (item.read) return;
    if (item.source === "notification") {
      handleMarkAsRead(item.id);
    } else if (item.source === "message") {
      setReadMessageIds(prev => [...prev, item.id]);
    } else if (item.source === "announcement") {
      setReadAnnouncementIds(prev => [...prev, item.id]);
    }
  };

  const handleNotificationClick = (item: typeof unifiedNotifications[0]) => {
    handleMarkItemAsRead(item);

    if (item.source === "message") {
      setActiveChatRecipientId(item.senderId || "ALL");
      setActiveTab("chat");
    } else if (item.source === "announcement") {
      setNotificationCenterSubTab("announcements");
      setActiveTab("notifications");
    } else if (item.source === "notification") {
      if (item.title?.includes("nghỉ phép")) {
        setActiveTab("leave");
      } else {
        setNotificationCenterSubTab("personal");
        setActiveTab("notifications");
      }
    }

    setIsNotificationPopoverOpen(false);
  };

  const handleMarkAllUnifiedAsRead = () => {
    if (!currentUser) return;
    
    // Handle personal notifications
    handleMarkAllAsRead();
    
    // Handle messages
    const unreadMessageIds = (data.messages || [])
      .filter(m => m.senderId !== currentUser.id && (m.receiverId === currentUser.id || m.receiverId === "ALL") && !readMessageIds.includes(m.id))
      .map(m => m.id);
    if (unreadMessageIds.length > 0) {
      setReadMessageIds(prev => [...prev, ...unreadMessageIds]);
    }

    // Handle announcements
    const unreadAnnouncementIds = data.announcements
      .filter(a => !readAnnouncementIds.includes(a.id))
      .map(a => a.id);
    if (unreadAnnouncementIds.length > 0) {
      setReadAnnouncementIds(prev => [...prev, ...unreadAnnouncementIds]);
    }

    toast.success("Đã đánh dấu tất cả là đã đọc");
  };

  const handleDeleteItem = (item: typeof unifiedNotifications[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.source === "notification") {
      handleDeleteNotification(item.id);
    } else if (item.source === "message") {
      handleDeleteMessage(item.id);
    } else if (item.source === "announcement") {
      if (isAdmin) {
        handleDeleteAnnouncement(item.id);
      } else {
        setDismissedAnnouncementIds(prev => [...prev, item.id]);
        toast.success("Đã ẩn thông báo");
      }
    }
  };

  const handleClearAllUnifiedNotifications = () => {
    if (!currentUser) return;

    setData(prev => {
      // 1. Delete all personal notifications of currentUser
      const updatedNotifications = prev.notifications.filter(n => n.userId !== currentUser.id);

      // 2. Delete all received messages for currentUser
      const updatedMessages = (prev.messages || []).filter(
        m => !(m.senderId !== currentUser.id && (m.receiverId === currentUser.id || m.receiverId === "ALL"))
      );

      // 3. For announcements: can delete if admin, otherwise hide them (add to dismissed ids)
      let updatedAnnouncements = prev.announcements;
      if (isAdmin) {
        updatedAnnouncements = [];
      } else {
        const allAnnouncementIds = prev.announcements.map(a => a.id);
        setDismissedAnnouncementIds(prevDismissed => {
          return Array.from(new Set([...prevDismissed, ...allAnnouncementIds]));
        });
      }

      return {
        ...prev,
        notifications: updatedNotifications,
        messages: updatedMessages,
        announcements: updatedAnnouncements
      };
    });

    toast.success("Đã xóa toàn bộ thông báo và tin nhắn");
  };

  // Automatically switch tab when login status / role determines initially or transitions
  useEffect(() => {
    if (currentUser) {
      setActiveTab(currentUser.role === "ADMIN" ? "summary" : "shifts");
    }
  }, [currentUser?.id, currentUser?.role]);

  // Initialize notifications ref on mount or when data loads
  useEffect(() => {
    if (data.notifications) {
      if (!isLoadedRef.current) {
        prevNotificationsRef.current = data.notifications.map(n => n.id);
        isLoadedRef.current = true;
      }
    }
  }, [data.notifications]);

  // When notifications are added:
  useEffect(() => {
    if (!data.notifications || !currentUser || !isLoadedRef.current) return;
    
    // Find notifications that are new (not present in our ref)
    const newNotifications = data.notifications.filter(
      n => !prevNotificationsRef.current.includes(n.id)
    );

    if (newNotifications.length > 0) {
      // Update ref
      prevNotificationsRef.current = data.notifications.map(n => n.id);

      // Check if any of these are for the current user and email notification is enabled & user has an email
      const userSettings = data.settings[currentUser.id] || { emailNotifications: true, appNotifications: true, reminderFrequency: "1_DAY" };
      if (userSettings.emailNotifications && currentUser.email) {
        const myNewNotifications = newNotifications.filter(n => n.userId === currentUser.id);
        myNewNotifications.forEach(n => {
          toast(
            <div className="flex flex-col gap-1.5 w-full text-slate-800 dark:text-slate-100">
              <span className="font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Mail className="h-4 w-4 text-blue-500" /> Hệ thống đã gửi email thông báo!
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Đã gửi đến: <strong className="text-slate-950 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{currentUser.email}</strong>
              </span>
              <span className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-2 rounded border border-slate-200 dark:border-slate-800 leading-snug">
                <strong className="text-slate-950 dark:text-white font-bold">{n.title}</strong>: {n.message}
              </span>
            </div>,
            {
              duration: 8000,
            }
          );
        });
      }
    }
  }, [data.notifications, currentUser, data.settings]);

  // When unified notifications are added:
  useEffect(() => {
    if (!currentUser) {
      seenUnifiedIdsRef.current = [];
      isUnifiedLoadedRef.current = false;
      return;
    }

    if (!isUnifiedLoadedRef.current) {
      if (unifiedNotifications.length > 0) {
        seenUnifiedIdsRef.current = unifiedNotifications.map(n => n.id);
        isUnifiedLoadedRef.current = true;
      }
      return;
    }

    const newItems = unifiedNotifications.filter(
      item => !seenUnifiedIdsRef.current.includes(item.id)
    );

    if (newItems.length > 0) {
      // Update our ref
      seenUnifiedIdsRef.current = [
        ...seenUnifiedIdsRef.current,
        ...newItems.map(item => item.id)
      ];

      // Trigger toasts for each new unread notification
      newItems.forEach(item => {
        if (item.read) return;

        // Don't show toast for "Tin nhắn riêng mới" notifications since they are already covered by the premium custom message toast effect
        if (item.source === "notification" && item.title === "Tin nhắn riêng mới") {
          return;
        }

        // Determine styling details
        let iconElement = <Bell className="h-4 w-4 text-blue-500" />;
        let sourceLabel = "Thông báo mới";
        let iconBg = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50";

        if (item.source === "notification" && item.title?.includes("nghỉ phép")) {
          iconElement = <Palmtree className="h-4 w-4 text-rose-500" />;
          sourceLabel = "Đăng ký nghỉ phép";
          iconBg = "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50";
        } else if (item.source === "message") {
          iconElement = <MessageSquare className="h-4 w-4 text-emerald-500" />;
          sourceLabel = item.title; // e.g. "💬 Tin nhắn từ ..." or "💬 Tin nhắn nhóm..."
          iconBg = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-teal-400 border border-emerald-100 dark:border-emerald-900/50";
          
          // Avoid double-toasting private messages since other effect already handles private ones
          const isPrivateMsg = data.messages?.some(
            m => m.id === item.id && m.receiverId !== "ALL" && m.receiverId === currentUser.id
          );
          if (isPrivateMsg) return;
        } else if (item.source === "announcement") {
          iconElement = <Megaphone className="h-4 w-4 text-amber-500" />;
          sourceLabel = "Bảng tin chung";
          iconBg = "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50";
        }

        toast(
          <div className="flex gap-3 w-full text-slate-800 dark:text-slate-100">
            <div className={`p-2 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center ${iconBg}`}>
              {iconElement}
            </div>
            <div className="flex flex-col gap-1 w-full text-left">
              <span className="font-bold text-[13px] leading-tight text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                {sourceLabel}
              </span>
              <span className="text-[12px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                {item.source === "announcement" ? item.title.replace("📢 ", "") : item.title}
              </span>
              <span className="text-[11px] bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-300 p-2 rounded-lg border border-slate-100 dark:border-slate-800 leading-normal font-medium max-h-24 overflow-y-auto mt-0.5">
                {item.message}
              </span>
            </div>
          </div>,
          {
            duration: 8000,
            action: {
              label: "Xem ngay",
              onClick: () => {
                handleNotificationClick(item);
              }
            }
          }
        );
      });
    }
  }, [unifiedNotifications, currentUser, data.messages]);

  // Initialize messages ref on mount or when data loads
  useEffect(() => {
    if (data.messages) {
      if (!isMessagesLoadedRef.current) {
        prevMessagesRef.current = data.messages.map(m => m.id);
        isMessagesLoadedRef.current = true;
      }
    }
  }, [data.messages]);

  // When new messages are added:
  useEffect(() => {
    if (!data.messages || !currentUser || !isMessagesLoadedRef.current) return;

    const newMessages = data.messages.filter(
      m => !prevMessagesRef.current.includes(m.id)
    );

    if (newMessages.length > 0) {
      // Update ref
      prevMessagesRef.current = data.messages.map(m => m.id);

      newMessages.forEach(msg => {
        // Is it a private message? (receiverId !== "ALL")
        if (msg.receiverId !== "ALL") {
          // If the logged-in user is the receiver
          if (msg.receiverId === currentUser.id) {
            toast(
              <div className="flex flex-col gap-1.5 w-full text-slate-800 dark:text-slate-100">
                <span className="font-bold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <MessageSquare className="h-4 w-4 text-blue-500" /> Tin nhắn riêng mới!
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Từ: <strong className="text-slate-950 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{msg.senderName}</strong>
                </span>
                <span className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-2 rounded border border-slate-200 dark:border-slate-800 leading-snug">
                  {msg.content}
                </span>
              </div>,
              {
                duration: 6000,
                action: {
                  label: "Xem ngay",
                  onClick: () => {
                    setActiveTab("chat");
                    setActiveChatRecipientId(msg.senderId);
                  }
                }
              }
            );

            // Also save as an in-app notification in data.notifications so it appears in the NotificationCenter
            setData(prev => {
              // Ensure we don't add duplicates
              const alreadyExists = prev.notifications.some(
                n => n.title === "Tin nhắn riêng mới" && n.message.includes(msg.content.substring(0, 20))
              );
              if (alreadyExists) return prev;
              
              return {
                ...prev,
                notifications: [
                  ...prev.notifications,
                  {
                    id: crypto.randomUUID(),
                    userId: currentUser.id,
                    title: "Tin nhắn riêng mới",
                    message: `Bạn nhận được tin nhắn riêng mới từ ${msg.senderName}: "${msg.content.substring(0, 30)}${msg.content.length > 30 ? "..." : ""}"`,
                    type: "SYSTEM",
                    read: false,
                    createdAt: new Date().toISOString()
                  }
                ]
              };
            });
          }
          // If the logged-in user is the sender
          else if (msg.senderId === currentUser.id) {
            const receiver = data.staff.find(s => s.id === msg.receiverId);
            toast(
              <div className="flex flex-col gap-1.5 w-full text-slate-800 dark:text-slate-100">
                <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Mail className="h-4 w-4 text-emerald-500" /> Đã gửi tin nhắn riêng!
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Đến: <strong className="text-slate-950 dark:text-white font-bold bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{receiver?.name || "Thành viên"}</strong>
                </span>
                <span className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-2 rounded border border-slate-200 dark:border-slate-800 leading-snug">
                  {msg.content}
                </span>
              </div>,
              {
                duration: 4000,
              }
            );
          }
        }
      });
    }
  }, [data.messages, currentUser, data.staff]);

  // Load from Supabase on mount
  useEffect(() => {
    async function loadCloudData() {
      if (isSupabaseConfigured && !hasLoadedCloud.current) {
        hasLoadedCloud.current = true;
        setIsLoadingCloud(true);
        const cloudData = await supabaseService.loadAppData();
        if (cloudData) {
          setData(prev => ({
            staff: cloudData.staff || [],
            shifts: cloudData.shifts || [],
            holidays: cloudData.holidays || [],
            leaveRequests: cloudData.leaveRequests || [],
            notifications: cloudData.notifications || [],
            announcements: cloudData.announcements || [],
            messages: cloudData.messages || [],
            settings: cloudData.settings || {},
            config: cloudData.config || { nursesPerDay: 3 },
            currentUser: prev.currentUser // Keep current login session
          }));
          setLastSynced(new Date());
          toast.success("Đã tải dữ liệu từ Supabase Cloud");
        }
        setIsLoadingCloud(false);
      }
    }
    loadCloudData();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    
    if (isSyncingFromCloudRef.current) {
      isSyncingFromCloudRef.current = false;
      return;
    }
    
    lastLocalChangeRef.current = Date.now();
    
    // Auto sync to cloud with debounce (reduced to 800ms for fast and robust updates)
    const timer = setTimeout(() => {
      if (isSupabaseConfigured && !isLoadingCloud) {
        syncToCloud(undefined, true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [data]);

  // Poll cloud data for real-time messages & updates
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      // Only pull if:
      // 1. Not currently syncing
      // 2. Not loading initially
      // 3. No local changes made in the last 7 seconds (allow auto-sync debounce to complete safely)
      // 4. Page is focused / visible so we don't waste resources in inactive background tabs
      if (
        !isSyncing &&
        !isLoadingCloud &&
        Date.now() - lastLocalChangeRef.current > 7000 &&
        document.visibilityState === "visible"
      ) {
        try {
          const cloudData = await supabaseService.loadAppData();
          if (cloudData && isMounted) {
            setData(prev => {
              // We check if messages, notifications, shifts, leave requests or staff have updated
              const hasNewMessages = (cloudData.messages || []).length !== (prev.messages || []).length ||
                JSON.stringify(cloudData.messages) !== JSON.stringify(prev.messages);
              
              const hasNewShifts = JSON.stringify(cloudData.shifts) !== JSON.stringify(prev.shifts);
              const hasNewLeaveRequests = JSON.stringify(cloudData.leaveRequests) !== JSON.stringify(prev.leaveRequests);
              const hasNewAnnouncements = JSON.stringify(cloudData.announcements) !== JSON.stringify(prev.announcements);
              const hasNewNotifications = JSON.stringify(cloudData.notifications) !== JSON.stringify(prev.notifications);
              
              if (hasNewMessages || hasNewShifts || hasNewLeaveRequests || hasNewAnnouncements || hasNewNotifications) {
                isSyncingFromCloudRef.current = true;
                return {
                  ...prev,
                  staff: cloudData.staff || prev.staff,
                  shifts: cloudData.shifts || prev.shifts,
                  holidays: cloudData.holidays || prev.holidays,
                  leaveRequests: cloudData.leaveRequests || prev.leaveRequests,
                  notifications: cloudData.notifications || prev.notifications,
                  announcements: cloudData.announcements || prev.announcements,
                  messages: cloudData.messages || prev.messages,
                  settings: cloudData.settings || prev.settings,
                  config: cloudData.config || prev.config,
                };
              }
              return prev;
            });
          }
        } catch (err) {
          console.error("Failed to poll cloud data:", err);
        }
      }
    }, 3000); // 3 seconds interval

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLoadingCloud, isSyncing]);

  const syncToCloud = async (overrideData?: AppData, silent = false) => {
    if (!isSupabaseConfigured) return;
    
    setIsSyncing(true);
    const success = await supabaseService.saveAppData(overrideData || data);
    if (success) {
      setLastSynced(new Date());
      if (!silent) {
        toast.success("Đã đồng bộ dữ liệu lên Cloud");
      }
    } else if (!silent) {
      toast.error("Lỗi đồng bộ dữ liệu Cloud");
    }
    setIsSyncing(false);
  };

  const handleLogin = (user: Staff) => {
    setData(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    setData(prev => ({ ...prev, currentUser: null }));
  };

  const handleAddStaff = (s: Staff) => {
    setData(prev => ({ ...prev, staff: [...prev.staff, s] }));
  };

  const handleUpdateStaff = (s: Staff) => {
    setData(prev => ({
      ...prev,
      staff: prev.staff.map(item => item.id === s.id ? s : item)
    }));
  };

  const handleDeleteStaff = (id: string) => {
    setData(prev => ({
      ...prev,
      staff: prev.staff.filter(item => item.id !== id),
      shifts: prev.shifts.map(shift => ({
        ...shift,
        assignments: shift.assignments.filter(a => a.staffId !== id)
      }))
    }));
  };

  const handleImportStaff = (staffList: Staff[]) => {
    setData(prev => ({ ...prev, staff: [...prev.staff, ...staffList.map(s => ({ ...s, role: s.role || "NURSE" as const }))] }));
  };

  const handleResetPassword = (staffId: string) => {
    setData(prev => ({
      ...prev,
      staff: prev.staff.map(s => s.id === staffId ? { ...s, password: "123456" } : s)
    }));
    toast.success("Đã đặt lại mật khẩu về mặc định (123456)");
  };

  const handleSaveShifts = (newShifts: Shift[]) => {
    setData(prev => {
      const oldShifts = prev.shifts;
      const newNotifications: Notification[] = [];
      let totalChanges = 0;

      // Detect changes for notifications
      newShifts.forEach(newShift => {
        const oldShift = oldShifts.find(s => s.date === newShift.date);
        const oldAssignments = oldShift?.assignments || [];
        
        newShift.assignments.forEach((newA, index) => {
          if (!newA.staffId) return;
          
          const oldA = oldAssignments[index];
          const isNewAssignment = !oldA || oldA.staffId !== newA.staffId;
          
          if (isNewAssignment) {
            totalChanges++;
            newNotifications.push({
              id: crypto.randomUUID(),
              userId: newA.staffId,
              title: "Phân công lịch trực mới",
              message: `Bạn đã được phân công lịch trực vào ngày ${formatDateStr(newShift.date)}.`,
              type: "SCHEDULE_UPDATE",
              read: false,
              createdAt: new Date().toISOString()
            });
          }
        });
      });

      const newAnnouncements: Announcement[] = [];
      if (totalChanges > 0 && currentUser) {
        newAnnouncements.push({
          id: crypto.randomUUID(),
          title: "Cập nhật lịch trực",
          content: `Lịch trực đã được cập nhật bởi ${currentUser.name}. Có ${totalChanges} thay đổi nhân sự.`,
          authorId: currentUser.id,
          authorName: currentUser.name,
          createdAt: new Date().toISOString(),
          type: "INFO"
        });
      }

      return {
        ...prev,
        shifts: newShifts,
        notifications: [...prev.notifications, ...newNotifications],
        announcements: [...prev.announcements, ...newAnnouncements]
      };
    });
    toast.success("Đã lưu lịch trực thành công!");
  };

  const handleAddLeaveRequest = (req: LeaveRequest) => {
    let nextData: AppData | null = null;
    setData(prev => {
      // Find the name of the staff requesting the leave
      const requester = prev.staff.find(s => s.id === req.staffId);
      const requesterName = requester ? requester.name : "Nhân viên";

      // Find all unique admin IDs in the system (always include 'admin-id', currently logged-in admin, and any ADMIN staff)
      const adminIds = new Set<string>(["admin-id"]);
      if (currentUser && (currentUser.role === "ADMIN" || currentUser.id === "admin-id")) {
        adminIds.add(currentUser.id);
      }
      prev.staff.forEach(s => {
        if (s.role === "ADMIN" || s.id === "admin-id" || s.code === "ADMIN") {
          adminIds.add(s.id);
        }
      });

      // Create a notification for each administrator in the system
      const adminNotifications: Notification[] = Array.from(adminIds).map(adminId => ({
        id: crypto.randomUUID(),
        userId: adminId,
        title: "Đăng ký nghỉ phép mới 🔔",
        message: `${requesterName} vừa đăng ký nghỉ phép từ ngày ${formatDateStr(req.startDate)} đến ngày ${formatDateStr(req.endDate)}. Lý do: ${req.reason}`,
        type: "SYSTEM",
        read: false,
        createdAt: new Date().toISOString()
      }));

      nextData = {
        ...prev,
        leaveRequests: [...prev.leaveRequests, req],
        notifications: [...prev.notifications, ...adminNotifications]
      };
      return nextData;
    });

    // Sync instantly to cloud so logging out or switching users immediately will not lose notifications/requests
    if (nextData) {
      syncToCloud(nextData, true);
    }
  };

  const handleUpdateLeaveStatus = (id: string, status: LeaveRequest["status"]) => {
    let nextData: AppData | null = null;
    setData(prev => {
      const req = prev.leaveRequests.find(r => r.id === id);
      if (!req) return prev;

      const notification: Notification = {
        id: crypto.randomUUID(),
        userId: req.staffId,
        title: status === "APPROVED" ? "Yêu cầu nghỉ phép được chấp nhận" : "Yêu cầu nghỉ phép bị từ chối",
        message: `Yêu cầu nghỉ từ ngày ${formatDateStr(req.startDate)} đến ngày ${formatDateStr(req.endDate)} đã được ${status === "APPROVED" ? "phê duyệt" : "từ chối"}.`,
        type: "SYSTEM",
        read: false,
        createdAt: new Date().toISOString()
      };

      nextData = {
        ...prev,
        leaveRequests: prev.leaveRequests.map(r => r.id === id ? { ...r, status } : r),
        notifications: [...prev.notifications, notification]
      };
      return nextData;
    });

    // Sync instantly to cloud so that the approve/reject notification is pushed immediately to the staff
    if (nextData) {
      syncToCloud(nextData, true);
    }
  };

  const handleDeleteLeaveRequest = (id: string) => {
    let nextData: AppData | null = null;
    setData(prev => {
      nextData = {
        ...prev,
        leaveRequests: prev.leaveRequests.filter(r => r.id !== id)
      };
      return nextData;
    });

    if (nextData) {
      syncToCloud(nextData, true);
    }
    toast.success("Đã xóa yêu cầu nghỉ phép thành công");
  };

  const handleUpdateSettings = (settings: UserSettings) => {
    if (!currentUser) return;
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, [currentUser.id]: settings }
    }));
    toast.success("Đã lưu cài đặt thông báo");
  };

  const handleUpdateUserEmail = (email: string) => {
    if (!currentUser) return;
    setData(prev => {
      const updatedStaff = prev.staff.map(s => 
        s.id === currentUser.id ? { ...s, email } : s
      );
      const updatedCurrentUser = {
        ...currentUser,
        email
      };
      return {
        ...prev,
        staff: updatedStaff,
        currentUser: updatedCurrentUser
      };
    });
  };

  const handleMarkAsRead = (id: string) => {
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    }));
  };

  const handleMarkAllAsRead = () => {
    if (!currentUser) return;
    setData(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => n.userId === currentUser.id ? { ...n, read: true } : n)
    }));
  };

  const handleAddNotification = (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    setData(prev => ({
      ...prev,
      notifications: [
        ...prev.notifications,
        {
          ...notification,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    toast.success("Đã gửi thông báo thành công");
  };

  const handleAddAnnouncement = (announcement: Omit<Announcement, "id" | "createdAt" | "authorId" | "authorName">) => {
    if (!currentUser) return;
    setData(prev => ({
      ...prev,
      announcements: [
        ...prev.announcements,
        {
          ...announcement,
          id: crypto.randomUUID(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    toast.success("Đã đăng thông báo công khai thành công");
  };

  const handleDeleteAnnouncement = (id: string) => {
    setData(prev => ({
      ...prev,
      announcements: prev.announcements.filter(a => a.id !== id)
    }));
    toast.success("Đã xóa thông báo");
  };

  const handleUpdateConfig = (config: AppData["config"]) => {
    setData(prev => ({ ...prev, config }));
  };

  const userNotifications = useMemo(() => {
    return data.notifications.filter(n => n.userId === currentUser?.id).map(n => ({
      ...n,
      message: formatAllDatesInText(n.message)
    }));
  }, [data.notifications, currentUser]);

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleSendMessage = (message: Message) => {
    let nextData: AppData | null = null;
    setData(prev => {
      nextData = {
        ...prev,
        messages: [...(prev.messages || []), message]
      };
      return nextData;
    });

    if (nextData) {
      syncToCloud(nextData, true);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    let nextData: AppData | null = null;
    setData(prev => {
      nextData = {
        ...prev,
        messages: (prev.messages || []).filter(m => m.id !== messageId)
      };
      return nextData;
    });

    if (nextData) {
      syncToCloud(nextData, true);
    }
    toast.success("Đã xóa tin nhắn");
  };

  const handleChangePassword = () => {
    if (!currentUser) return;
    if (passwordData.new !== passwordData.confirm) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    const currentPassword = currentUser.password || "123456";
    if (passwordData.current !== currentPassword) {
      toast.error("Mật khẩu hiện tại không đúng");
      return;
    }

    const updatedStaff = data.staff.map(s => 
      s.id === currentUser.id ? { ...s, password: passwordData.new } : s
    );

    setData(prev => ({
      ...prev,
      staff: updatedStaff,
      currentUser: { ...currentUser, password: passwordData.new }
    }));

    toast.success("Đã đổi mật khẩu thành công");
    setIsPasswordDialogOpen(false);
    setPasswordData({ current: "", new: "", confirm: "" });
  };

  if (!currentUser) {
    return (
      <>
        <Login staff={data.staff} onLogin={handleLogin} />
        <Toaster position="top-right" richColors theme={theme as any} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/40 to-blue-50/30 dark:from-slate-100/5 dark:via-slate-950 dark:to-teal-950/20 font-sans text-slate-900 dark:text-slate-100">
      <header className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-500 w-full" />
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-teal-500 p-2.5 rounded-xl shadow-md shadow-blue-500/15 relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Stethoscope className="h-5 w-5 text-white animate-heartbeat" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-sans font-extrabold tracking-tight text-slate-900 dark:text-white text-lg">
                  NurseShift <span className="text-blue-600 dark:text-teal-400">Pro</span>
                </h1>
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 relative" title="Hệ thống đang chạy">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                </span>
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-extrabold">Hệ thống điều phối lịch trực</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700">
              <UserCircle className="h-5 w-5 text-blue-600 dark:text-teal-400" />
              <div className="text-xs">
                <p className="font-bold text-slate-700 dark:text-slate-200 leading-none mb-1">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none">{isAdmin ? "Quản trị viên" : "Điều dưỡng viên"}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 ml-1 text-slate-400 hover:text-blue-600 dark:hover:text-teal-400"
                onClick={() => setIsPasswordDialogOpen(true)}
                title="Đổi mật khẩu"
              >
                <Key className="h-3.5 w-3.5" />
              </Button>
            </div>
              
              <ThemeToggle />

              {isSupabaseConfigured && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => syncToCloud()} 
                  disabled={isSyncing}
                  title={lastSynced ? `Đồng bộ lần cuối: ${lastSynced.toLocaleTimeString()}` : "Đồng bộ Cloud"}
                >
                  <RefreshCw className={cn("h-5 w-5 text-blue-600", isSyncing && "animate-spin")} />
                </Button>
              )}

              {!isSupabaseConfigured && (
                <div title="Chưa cấu hình Supabase" className="p-2">
                  <CloudOff className="h-5 w-5 text-slate-400" />
                </div>
              )}

              <Popover 
                open={isNotificationPopoverOpen} 
                onOpenChange={(open) => {
                  setIsNotificationPopoverOpen(open);
                  if (!open) {
                    setShowConfirmClear(false);
                  }
                }}
              >
                <PopoverTrigger 
                  className="relative flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer outline-hidden"
                  title="Thông báo và tin nhắn"
                >
                  <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse font-bold">
                      {totalUnreadCount}
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-80 sm:w-96 p-0 mr-4 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden z-[100]" align="end">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-blue-600 dark:text-teal-400" />
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Thông báo gần đây</h4>
                    </div>
                    <div className="flex items-center gap-1">
                      {totalUnreadCount > 0 && (
                        <Button
                          variant="ghost"
                          className="text-xs h-7 px-2.5 text-blue-600 hover:text-blue-700 dark:text-teal-400 dark:hover:text-teal-300 font-semibold shadow-none"
                          onClick={handleMarkAllUnifiedAsRead}
                        >
                          Đọc tất cả
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shadow-none hover:bg-slate-100 dark:hover:bg-slate-800"
                        onClick={() => setIsNotificationPopoverOpen(false)}
                        title="Đóng popup"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Tabs defaultValue="unread" className="w-full">
                    <div className="px-4 pt-1 pb-1.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <TabsList className="grid grid-cols-2 bg-slate-100/60 dark:bg-slate-800/60 rounded-lg p-0.5 h-8">
                        <TabsTrigger value="unread" className="text-xs font-semibold h-7 rounded-md cursor-pointer">
                          Chưa đọc ({unifiedNotifications.filter(n => !n.read).length})
                        </TabsTrigger>
                        <TabsTrigger value="all" className="text-xs font-semibold h-7 rounded-md cursor-pointer">
                          Tất cả ({unifiedNotifications.length})
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="unread" className="m-0">
                      <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {unifiedNotifications.filter(n => !n.read).length > 0 ? (
                          unifiedNotifications.filter(n => !n.read).map(n => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/45 transition-colors cursor-pointer group relative"
                            >
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {n.source === "notification" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-semibold">
                                      <CalendarDays className="h-3 w-3" /> Lịch trực
                                    </span>
                                  )}
                                  {n.source === "message" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-semibold">
                                      <MessageSquare className="h-3 w-3" /> Tin nhắn
                                    </span>
                                  )}
                                  {n.source === "announcement" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-semibold">
                                      <Megaphone className="h-3 w-3" /> Chung
                                    </span>
                                  )}
                                  <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse" />
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {format(parseISO(n.createdAt), "HH:mm, dd/MM", { locale: vi })}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-800 dark:text-slate-200 text-xs mb-0.5">{n.title}</h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 pr-6 leading-relaxed">{n.message}</p>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 bottom-2 h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteItem(n, e)}
                                title="Xóa"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                            <Check className="h-8 w-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                            <p className="text-xs">Tuyệt vời! Bạn không có thông báo chưa đọc nào.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="all" className="m-0">
                      <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                        {unifiedNotifications.length > 0 ? (
                          unifiedNotifications.map(n => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={cn(
                                "p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group relative",
                                !n.read ? "bg-blue-50/20 dark:bg-blue-900/10" : "opacity-80"
                              )}
                            >
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {n.source === "notification" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md font-semibold">
                                      <CalendarDays className="h-3 w-3" /> Lịch trực
                                    </span>
                                  )}
                                  {n.source === "message" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md font-semibold">
                                      <MessageSquare className="h-3 w-3" /> Tin nhắn
                                    </span>
                                  )}
                                  {n.source === "announcement" && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-semibold">
                                      <Megaphone className="h-3 w-3" /> Chung
                                    </span>
                                  )}
                                  {!n.read && <span className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse" />}
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                  {format(parseISO(n.createdAt), "HH:mm, dd/MM", { locale: vi })}
                                </span>
                              </div>
                              <h5 className={cn("font-bold text-xs mb-0.5", !n.read ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400")}>{n.title}</h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 pr-6 leading-relaxed">{n.message}</p>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 bottom-2 h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleDeleteItem(n, e)}
                                title="Xóa"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Chưa có thông báo nào.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-950/20">
                    {!showConfirmClear ? (
                      <Button
                        variant="ghost"
                        disabled={unifiedNotifications.length === 0}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 py-1.5 h-auto font-bold w-full cursor-pointer shadow-none flex items-center justify-center gap-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
                        onClick={() => setShowConfirmClear(true)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa tất cả thông báo ({unifiedNotifications.length})
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5 px-2 py-0.5 animate-in fade-in zoom-in-95 duration-150">
                        <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Xác nhận xóa tất cả?
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/40 px-2.5 rounded-lg cursor-pointer"
                            onClick={() => {
                              handleClearAllUnifiedNotifications();
                              setShowConfirmClear(false);
                            }}
                          >
                            Xóa
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 rounded-lg cursor-pointer"
                            onClick={() => setShowConfirmClear(false)}
                          >
                            Hủy
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Đăng xuất">
                <LogOut className="h-5 w-5 text-red-500" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <div className="flex justify-center flex-wrap gap-2">
              <TabsList className={cn(
                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-slate-200/80 dark:border-slate-800 shadow-sm p-1.5 !h-auto min-h-[56px] overflow-visible w-full max-w-5xl rounded-2xl grid gap-1.5",
                isAdmin ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-8" : "grid-cols-2 sm:grid-cols-5"
              )}>
                {isAdmin && (
                  <TabsTrigger value="summary" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                    <LayoutDashboard className="h-4 w-4 mr-1" />
                    Tổng hợp
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger value="staff" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                    <Users className="h-4 w-4 mr-1" />
                    Nhân viên
                  </TabsTrigger>
                )}
                <TabsTrigger value="shifts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Lịch trực
                </TabsTrigger>
                <TabsTrigger value="personal-schedule" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                  <UserCircle className="h-4 w-4 mr-1" />
                  Lịch của tôi
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="holidays" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                    <Palmtree className="h-4 w-4 mr-1" />
                    Ngày lễ
                  </TabsTrigger>
                )}
                <TabsTrigger value="leave" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                  <ClipboardList className="h-4 w-4 mr-1" />
                  Nghỉ phép
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                  <Bell className="h-4 w-4 mr-1" />
                  Thông báo
                </TabsTrigger>
                <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl transition-all border border-transparent !h-auto text-slate-600 dark:text-slate-300 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 w-full data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 cursor-pointer">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Trò chuyện
                </TabsTrigger>
              </TabsList>
            </div>

          <TabsContent value="summary">
            <SummaryDashboard 
              staff={data.staff} 
              shifts={data.shifts} 
              holidays={data.holidays} 
              announcements={data.announcements}
            />
          </TabsContent>

          <TabsContent value="staff">
            <StaffManagement 
              staff={data.staff}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onImportStaff={handleImportStaff}
              onResetPassword={handleResetPassword}
            />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftScheduler 
              staff={data.staff}
              shifts={data.shifts}
              holidays={data.holidays}
              onSaveShifts={handleSaveShifts}
              isAdmin={isAdmin}
              nursesPerDay={data.config.nursesPerDay}
              onUpdateConfig={handleUpdateConfig}
              config={data.config}
            />
          </TabsContent>

          <TabsContent value="personal-schedule">
            <PersonalSchedule
              currentUser={currentUser}
              shifts={data.shifts}
              holidays={data.holidays}
              leaveRequests={data.leaveRequests}
            />
          </TabsContent>

          <TabsContent value="holidays">
            <HolidayManagement 
              holidays={data.holidays}
              staff={data.staff}
              shifts={data.shifts}
              onAddHoliday={prev => setData(d => ({ ...d, holidays: [...d.holidays, prev] }))}
              onDeleteHoliday={id => setData(d => ({ ...d, holidays: d.holidays.filter(h => h.id !== id) }))}
            />
          </TabsContent>

          <TabsContent value="leave">
            <LeaveRequestManagement
              requests={data.leaveRequests}
              staff={data.staff}
              currentUser={currentUser}
              onAddRequest={handleAddLeaveRequest}
              onUpdateStatus={handleUpdateLeaveStatus}
              onDeleteRequest={handleDeleteLeaveRequest}
            />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationCenter
              currentUser={currentUser}
              notifications={userNotifications}
              announcements={data.announcements}
              staff={data.staff}
              isAdmin={isAdmin}
              settings={data.settings[currentUser.id] || { emailNotifications: true, appNotifications: true, reminderFrequency: "1_DAY" }}
              onUpdateSettings={handleUpdateSettings}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onAddNotification={handleAddNotification}
              onAddAnnouncement={handleAddAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onUpdateUserEmail={handleUpdateUserEmail}
              activeSubTab={notificationCenterSubTab}
              onSubTabChange={setNotificationCenterSubTab}
            />
          </TabsContent>

          <TabsContent value="chat">
            <Chat 
              currentUser={currentUser}
              staff={data.staff}
              messages={data.messages}
              onSendMessage={handleSendMessage}
              onDeleteMessage={handleDeleteMessage}
              activeRecipientId={activeChatRecipientId}
              onActiveRecipientIdChange={setActiveChatRecipientId}
            />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto py-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; 2024 NurseShift Pro - Giải pháp quản lý y tế thông minh
          </p>
        </div>
      </footer>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Mật khẩu hiện tại</label>
              <Input 
                type="password" 
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Mật khẩu mới</label>
              <Input 
                type="password" 
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Xác nhận mật khẩu mới</label>
              <Input 
                type="password" 
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleChangePassword} className="bg-blue-600 hover:bg-blue-700">Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster position="top-right" richColors theme={theme as any} />
    </div>
  );
}
