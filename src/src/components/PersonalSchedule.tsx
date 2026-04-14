/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { Staff, Shift, Holiday, LeaveRequest } from "@/src/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, isSameDay, parseISO, startOfDay } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Clock, Palmtree, ClipboardX, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface PersonalScheduleProps {
  currentUser: Staff;
  shifts: Shift[];
  holidays: Holiday[];
  leaveRequests: LeaveRequest[];
}

export default function PersonalSchedule({
  currentUser,
  shifts = [],
  holidays = [],
  leaveRequests = [],
}: PersonalScheduleProps) {
  const upcomingWeek = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
  }, []);

  const scheduleData = useMemo(() => {
    return upcomingWeek.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      
      // Check for shift
      const shift = shifts.find(s => s.date === dateStr);
      const isWorking = shift?.assignments.some(a => a.staffId === currentUser.id);
      
      // Check for holiday
      const holiday = holidays.find(h => h.date === dateStr);
      
      // Check for approved leave
      const leave = leaveRequests.find(r => 
        r.staffId === currentUser.id && 
        r.status === "APPROVED" &&
        isWithinRange(day, r.startDate, r.endDate)
      );

      return {
        date: day,
        dateStr,
        isWorking,
        holiday,
        leave,
      };
    });
  }, [upcomingWeek, shifts, holidays, leaveRequests, currentUser.id]);

  function isWithinRange(date: Date, start: string, end: string) {
    const d = startOfDay(date);
    const s = startOfDay(parseISO(start));
    const e = startOfDay(parseISO(end));
    return d >= s && d <= e;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Lịch trực cá nhân
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Xem lịch làm việc của bạn trong 7 ngày tới</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {scheduleData.map((item, index) => (
          <Card 
            key={item.dateStr} 
            className={cn(
              "relative overflow-hidden transition-all hover:shadow-md border-t-4",
              item.isWorking ? "border-t-blue-500 bg-blue-50/30 dark:bg-blue-900/10" : "border-t-slate-200 dark:border-t-slate-800",
              item.holiday ? "border-t-orange-500" : "",
              item.leave ? "border-t-red-500 bg-red-50/30 dark:bg-red-900/10" : ""
            )}
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {format(item.date, "EEEE", { locale: vi })}
                  </p>
                  <CardTitle className="text-lg">{format(item.date, "dd/MM")}</CardTitle>
                </div>
                {index === 0 && (
                  <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-950">Hôm nay</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {item.isWorking ? (
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Có ca trực</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Không có ca</span>
                </div>
              )}

              {item.holiday && (
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 text-xs bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg border border-orange-100 dark:border-orange-900/50">
                  <Palmtree className="h-3.5 w-3.5" />
                  <span className="font-medium">{item.holiday.name}</span>
                </div>
              )}

              {item.leave && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-100 dark:border-red-900/50">
                  <ClipboardX className="h-3.5 w-3.5" />
                  <span className="font-medium">Nghỉ phép ({item.leave.type === "FULL" ? "Cả ngày" : "Nửa ngày"})</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Lưu ý:</p>
            <ul className="list-disc list-inside space-y-1 opacity-80">
              <li>Lịch trực có thể thay đổi bởi Quản trị viên. Vui lòng kiểm tra thông báo thường xuyên.</li>
              <li>Nếu bạn có việc đột xuất, hãy gửi yêu cầu nghỉ phép sớm nhất có thể.</li>
              <li>Các ngày lễ được hưởng lương theo quy định của bệnh viện.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
