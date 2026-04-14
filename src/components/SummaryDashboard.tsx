/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Staff, Shift, Holiday, Announcement } from "@/src/types";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Calendar as CalendarIcon, Filter, TrendingUp, Megaphone, Info, AlertTriangle } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from "@/lib/utils";

interface SummaryDashboardProps {
  staff: Staff[];
  shifts: Shift[];
  holidays: Holiday[];
  announcements: Announcement[];
}

export default function SummaryDashboard({
  staff = [],
  shifts = [],
  holidays = [],
  announcements = [],
}: SummaryDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  const holidayDates = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  const stats = useMemo(() => {
    return staff.map(s => {
      const staffShifts = shifts.filter(shift => 
        shift.assignments.some(a => a.staffId === s.id) && 
        isWithinInterval(parseISO(shift.date), { 
          start: parseISO(dateRange.start), 
          end: parseISO(dateRange.end) 
        })
      );

      const monthlyCounts: Record<string, string[]> = {};
      let holidayCount = 0;

      staffShifts.forEach(shift => {
        const monthKey = format(parseISO(shift.date), "MM/yyyy");
        if (!monthlyCounts[monthKey]) monthlyCounts[monthKey] = [];
        monthlyCounts[monthKey].push(format(parseISO(shift.date), "dd"));
        
        if (holidayDates.has(shift.date)) {
          holidayCount++;
        }
      });

      return {
        ...s,
        totalShifts: staffShifts.length,
        holidayCount,
        monthlyCounts,
      };
    }).filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [staff, shifts, holidayDates, dateRange, searchTerm]);

  const chartData = useMemo(() => {
    return stats.slice(0, 10).map(s => ({
      name: s.code,
      fullName: s.name,
      total: s.totalShifts,
      holiday: s.holidayCount
    })).sort((a, b) => b.total - a.total);
  }, [stats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Announcement Board Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Bảng thông báo chung</h2>
        </div>
        
        {announcements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3).map((a) => (
              <Card key={a.id} className={cn(
                "border-l-4 shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800",
                a.type === "INFO" ? "border-l-blue-500" : 
                a.type === "WARNING" ? "border-l-amber-500" : "border-l-red-500"
              )}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-bold truncate pr-4 dark:text-slate-200">{a.title}</CardTitle>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(parseISO(a.createdAt), "dd/MM", { locale: vi })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">{a.content}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 italic">By {a.authorName}</span>
                    {a.type === "URGENT" && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[8px] h-4 px-1 border-none">Khẩn</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed">
            <CardContent className="p-6 text-center text-slate-500 text-sm">
              Chưa có thông báo nào trên bảng tin.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium dark:text-slate-200">Biểu đồ trực (Top 10 nhân viên)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-slate-900 p-2 border dark:border-slate-800 rounded shadow-sm text-xs">
                            <p className="font-bold dark:text-slate-100">{payload[0].payload.fullName}</p>
                            <p className="text-blue-600 dark:text-blue-400">Tổng trực: {payload[0].value}</p>
                            <p className="text-orange-600 dark:text-orange-400">Trực lễ: {payload[1].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="holiday" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-medium dark:text-slate-200">Bộ lọc thống kê</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground dark:text-slate-400">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Tên nhân viên..." 
                  className="pl-8 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground dark:text-slate-400">Khoảng thời gian</label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="date" 
                  className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  value={dateRange.start} 
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
                <Input 
                  type="date" 
                  className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                  value={dateRange.end} 
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow className="dark:border-slate-800">
              <TableHead className="dark:text-slate-300">Họ và tên</TableHead>
              <TableHead className="dark:text-slate-300">Tên quy ước</TableHead>
              <TableHead className="dark:text-slate-300">Trực theo tháng</TableHead>
              <TableHead className="text-center dark:text-slate-300">Trực lễ</TableHead>
              <TableHead className="text-center dark:text-slate-300">Tổng ngày trực</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s) => (
              <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors dark:border-slate-800">
                <TableCell className="font-medium text-slate-900 dark:text-slate-200">{s.name}</TableCell>
                <TableCell className="text-blue-600 dark:text-blue-400 font-medium">{s.code}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(s.monthlyCounts).map(([month, dates]) => (
                      <div key={month}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="cursor-help bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50">
                              {month}: {(dates as string[]).length} ngày
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                            <p>Các ngày trực: {(dates as string[]).join(", ")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                    {Object.keys(s.monthlyCounts).length === 0 && (
                      <span className="text-xs text-muted-foreground italic dark:text-slate-500">Không có dữ liệu</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 border-none">
                    {s.holidayCount}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-600 dark:hover:bg-blue-800 border-none">
                    {s.totalShifts}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {stats.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Không tìm thấy dữ liệu thống kê.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
