/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Notification, UserSettings, Staff, Announcement } from "@/src/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Mail, Smartphone, Clock, Check, Plus, UserPlus, Megaphone, Trash2, Info, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface NotificationCenterProps {
  notifications: Notification[];
  announcements: Announcement[];
  staff: Staff[];
  isAdmin: boolean;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onAddNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  onAddAnnouncement: (announcement: Omit<Announcement, "id" | "createdAt" | "authorId" | "authorName">) => void;
  onDeleteAnnouncement: (id: string) => void;
}

export default function NotificationCenter({
  notifications,
  announcements,
  staff,
  isAdmin,
  settings,
  onUpdateSettings,
  onMarkAsRead,
  onMarkAllAsRead,
  onAddNotification,
  onAddAnnouncement,
  onDeleteAnnouncement,
}: NotificationCenterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [newNotif, setNewNotif] = useState({
    userId: "",
    title: "",
    message: "",
    type: "SYSTEM" as const,
  });
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "INFO" as const,
  });

  const handleAdd = () => {
    if (!newNotif.userId || !newNotif.title || !newNotif.message) return;
    onAddNotification(newNotif);
    setIsDialogOpen(false);
    setNewNotif({ userId: "", title: "", message: "", type: "SYSTEM" });
  };

  const handleAddAnnouncementSubmit = () => {
    if (!newAnnouncement.title || !newAnnouncement.content) return;
    onAddAnnouncement(newAnnouncement);
    setIsAnnouncementDialogOpen(false);
    setNewAnnouncement({ title: "", content: "", type: "INFO" });
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <div className="md:col-span-2 space-y-6">
        <Tabs defaultValue="announcements" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="announcements" className="gap-2">
                <Megaphone className="h-4 w-4" />
                Bảng thông báo
              </TabsTrigger>
              <TabsTrigger value="personal" className="gap-2">
                <Bell className="h-4 w-4" />
                Cá nhân
              </TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {isAdmin && (
                <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                  <DialogTrigger render={<Button variant="default" size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700" />}>
                      <Plus className="h-4 w-4" />
                      Đăng thông báo
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Đăng thông báo công khai</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Loại thông báo</label>
                        <Select
                          value={newAnnouncement.type}
                          onValueChange={(val: any) => setNewAnnouncement({ ...newAnnouncement, type: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INFO">Thông tin (Xanh)</SelectItem>
                            <SelectItem value="WARNING">Cảnh báo (Vàng)</SelectItem>
                            <SelectItem value="URGENT">Khẩn cấp (Đỏ)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tiêu đề</label>
                        <Input
                          value={newAnnouncement.title}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                          placeholder="Tiêu đề thông báo chung"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nội dung</label>
                        <Textarea
                          value={newAnnouncement.content}
                          onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                          placeholder="Nội dung chi tiết cho tất cả nhân viên"
                          rows={4}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>Hủy</Button>
                      <Button onClick={handleAddAnnouncementSubmit} className="bg-blue-600 hover:bg-blue-700">Đăng thông báo</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <TabsContent value="announcements" className="space-y-4">
            {announcements.length > 0 ? (
              announcements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((a) => (
                <Card key={a.id} className={cn(
                  "border-l-4 overflow-hidden",
                  a.type === "INFO" ? "border-l-blue-500" : 
                  a.type === "WARNING" ? "border-l-amber-500" : "border-l-red-500"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {a.type === "INFO" ? <Info className="h-4 w-4 text-blue-500" /> : 
                         a.type === "WARNING" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : 
                         <AlertTriangle className="h-4 w-4 text-red-500" />}
                        <CardTitle className="text-base font-bold">{a.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {format(parseISO(a.createdAt), "HH:mm, dd/MM/yyyy", { locale: vi })}
                        </span>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDeleteAnnouncement(a.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <CardDescription className="text-[10px] flex items-center gap-1">
                      Đăng bởi <span className="font-semibold text-slate-700 dark:text-slate-300">{a.authorName}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{a.content}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-12 text-center text-muted-foreground">
                <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Chưa có thông báo chung nào trên bảng.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="personal" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Thông báo riêng cho bạn</h3>
              <div className="flex gap-2">
                {isAdmin && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
                        <Plus className="h-4 w-4" />
                        Gửi thông báo riêng
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Gửi thông báo cho nhân viên</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Người nhận</label>
                          <Select
                            value={newNotif.userId}
                            onValueChange={(val) => setNewNotif({ ...newNotif, userId: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn nhân viên" />
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} ({s.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Tiêu đề</label>
                          <Input
                            value={newNotif.title}
                            onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                            placeholder="Nhập tiêu đề thông báo"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nội dung</label>
                          <Textarea
                            value={newNotif.message}
                            onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                            placeholder="Nhập nội dung chi tiết"
                            rows={4}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handleAdd}>Gửi thông báo</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                <Button variant="ghost" size="sm" onClick={onMarkAllAsRead}>
                  Đánh dấu tất cả đã đọc
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && onMarkAsRead(n.id)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                      n.read ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75" : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={cn("text-sm font-semibold", !n.read && "text-blue-900 dark:text-blue-300")}>
                        {n.title}
                      </h3>
                      <span className="text-[10px] text-slate-500">
                        {format(parseISO(n.createdAt), "HH:mm, dd/MM", { locale: vi })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{n.message}</p>
                    {!n.read && (
                      <div className="mt-2 flex justify-end">
                        <Badge className="bg-blue-600 text-[10px] h-4 px-1.5">Mới</Badge>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-12 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Bạn chưa có thông báo cá nhân nào.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-slate-600" />
              Cài đặt nhắc nhở
            </CardTitle>
            <CardDescription>Tùy chỉnh cách bạn nhận thông báo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  Email
                </div>
                <div className="text-xs text-muted-foreground">Nhận lịch qua email</div>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(val) => onUpdateSettings({ ...settings, emailNotifications: val })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-slate-500" />
                  Ứng dụng
                </div>
                <div className="text-xs text-muted-foreground">Thông báo đẩy trên web</div>
              </div>
              <Switch
                checked={settings.appNotifications}
                onCheckedChange={(val) => onUpdateSettings({ ...settings, appNotifications: val })}
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-medium">Tần suất nhắc nhở trước ca trực</label>
              <Select
                value={settings.reminderFrequency}
                onValueChange={(val: any) => onUpdateSettings({ ...settings, reminderFrequency: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tần suất" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Không nhắc nhở</SelectItem>
                  <SelectItem value="1_HOUR">Trước 1 giờ</SelectItem>
                  <SelectItem value="1_DAY">Trước 1 ngày</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
      {children}
    </span>
  );
}
