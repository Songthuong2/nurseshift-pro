/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Staff, Shift, Holiday, AppData, ShiftAssignment, LeaveRequest, Notification, Announcement, UserSettings } from "@/src/types";
import StaffManagement from "@/src/components/StaffManagement";
import ShiftScheduler from "@/src/components/ShiftScheduler";
import HolidayManagement from "@/src/components/HolidayManagement";
import SummaryDashboard from "@/src/components/SummaryDashboard";
import LeaveRequestManagement from "@/src/components/LeaveRequestManagement";
import NotificationCenter from "@/src/components/NotificationCenter";
import PersonalSchedule from "@/src/components/PersonalSchedule";
import Login from "@/src/components/Login";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Users, CalendarDays, Palmtree, Stethoscope, Clock, Bell, LogOut, UserCircle, ClipboardList, Moon, Sun, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { EXAMPLE_LUNAR_HOLIDAYS, DEFAULT_SOLAR_HOLIDAYS } from "@/src/lib/date-utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { supabaseService } from "@/src/services/supabaseService";
import { isSupabaseConfigured } from "@/src/lib/supabase";
import { cn } from "@/lib/utils";

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

export default function App() {
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
      currentUser: null,
      settings: {},
      config: { nursesPerDay: 3 }
    };
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(isSupabaseConfigured);

  const currentUser = data.currentUser;
  const isAdmin = currentUser?.role === "ADMIN";

  // Load from Supabase on mount
  useEffect(() => {
    async function loadCloudData() {
      if (isSupabaseConfigured) {
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
    
    // Auto sync to cloud with debounce
    const timer = setTimeout(() => {
      if (isSupabaseConfigured && !isLoadingCloud) {
        syncToCloud();
      }
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timer);
  }, [data]);

  const syncToCloud = async (overrideData?: AppData) => {
    if (!isSupabaseConfigured) return;
    
    setIsSyncing(true);
    const success = await supabaseService.saveAppData(overrideData || data);
    if (success) {
      setLastSynced(new Date());
      toast.success("Đã đồng bộ dữ liệu lên Cloud");
    } else {
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
    setData(prev => ({ ...prev, staff: [...prev.staff, { ...s, role: "NURSE" }] }));
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
    setData(prev => ({ ...prev, staff: [...prev.staff, ...staffList.map(s => ({ ...s, role: "NURSE" as const }))] }));
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
              message: `Bạn đã được phân công lịch trực vào ngày ${newShift.date}.`,
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

      toast.success("Đã lưu lịch trực thành công!");

      return {
        ...prev,
        shifts: newShifts,
        notifications: [...prev.notifications, ...newNotifications],
        announcements: [...prev.announcements, ...newAnnouncements]
      };
    });
  };

  const handleAddLeaveRequest = (req: LeaveRequest) => {
    setData(prev => ({ ...prev, leaveRequests: [...prev.leaveRequests, req] }));
  };

  const handleUpdateLeaveStatus = (id: string, status: LeaveRequest["status"]) => {
    setData(prev => {
      const req = prev.leaveRequests.find(r => r.id === id);
      if (!req) return prev;

      const notification: Notification = {
        id: crypto.randomUUID(),
        userId: req.staffId,
        title: status === "APPROVED" ? "Yêu cầu nghỉ phép được chấp nhận" : "Yêu cầu nghỉ phép bị từ chối",
        message: `Yêu cầu nghỉ từ ${req.startDate} đến ${req.endDate} đã được ${status === "APPROVED" ? "phê duyệt" : "từ chối"}.`,
        type: "SYSTEM",
        read: false,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        leaveRequests: prev.leaveRequests.map(r => r.id === id ? { ...r, status } : r),
        notifications: [...prev.notifications, notification]
      };
    });
  };

  const handleUpdateSettings = (settings: UserSettings) => {
    if (!currentUser) return;
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, [currentUser.id]: settings }
    }));
    toast.success("Đã lưu cài đặt thông báo");
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

  const userNotifications = useMemo(() => {
    return data.notifications.filter(n => n.userId === currentUser?.id);
  }, [data.notifications, currentUser]);

  const unreadCount = userNotifications.filter(n => !n.read).length;

  if (!currentUser) {
    return (
      <>
        <Login staff={data.staff} onLogin={handleLogin} />
        <Toaster position="top-right" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">NurseShift Pro</h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Hệ thống quản lý lịch trực</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full border dark:border-slate-700">
                <UserCircle className="h-5 w-5 text-blue-600" />
                <div className="text-xs">
                  <p className="font-bold text-slate-700 dark:text-slate-200">{currentUser.name}</p>
                  <p className="text-slate-500 dark:text-slate-400">{isAdmin ? "Quản trị viên" : "Điều dưỡng viên"}</p>
                </div>
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

              <Button variant="ghost" size="icon" className="relative" onClick={() => {}}>
                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                    {unreadCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Đăng xuất">
                <LogOut className="h-5 w-5 text-red-500" />
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Tabs defaultValue={isAdmin ? "summary" : "shifts"} className="space-y-8">
            <div className="flex justify-center">
              <TabsList className="bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm p-2 !h-auto min-h-[56px] flex-wrap justify-center gap-x-2 gap-y-3 overflow-visible w-full max-w-4xl">
                {isAdmin && (
                  <TabsTrigger value="summary" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Tổng hợp
                  </TabsTrigger>
                )}
                {isAdmin && (
                  <TabsTrigger value="staff" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                    <Users className="h-4 w-4 mr-2" />
                    Nhân viên
                  </TabsTrigger>
                )}
                <TabsTrigger value="shifts" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Lịch trực
                </TabsTrigger>
                <TabsTrigger value="personal-schedule" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Lịch của tôi
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="holidays" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                    <Palmtree className="h-4 w-4 mr-2" />
                    Ngày lễ
                  </TabsTrigger>
                )}
                <TabsTrigger value="leave" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Nghỉ phép
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 px-5 py-2.5 rounded-lg transition-all border border-transparent data-[state=active]:border-blue-100 dark:data-[state=active]:border-blue-900/50 !h-auto">
                  <Bell className="h-4 w-4 mr-2" />
                  Thông báo
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
            />
          </TabsContent>

          <TabsContent value="shifts">
            <ShiftScheduler 
              staff={data.staff}
              shifts={data.shifts}
              holidays={data.holidays}
              onSaveShifts={handleSaveShifts}
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
            />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationCenter
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
      
      <Toaster position="top-right" richColors />
    </div>
  );
}
