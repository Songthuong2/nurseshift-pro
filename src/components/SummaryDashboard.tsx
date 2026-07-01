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
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar as CalendarIcon, 
  Filter, 
  TrendingUp, 
  Megaphone, 
  Info, 
  AlertTriangle, 
  SlidersHorizontal, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  Group, 
  Layers, 
  Check, 
  ChevronRight, 
  BarChart2, 
  TableProperties
} from "lucide-react";
import { 
  format, 
  parseISO, 
  isWithinInterval, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear,
  addMonths
} from "date-fns";
import { vi } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  // General view tabs: "overview" or "custom-report"
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Search & Basic filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });

  // Custom report configurations
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("total-desc");
  const [groupByDept, setGroupByDept] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    code: true,
    department: true,
    monthlyBreakdown: true,
    holidayShifts: true,
    weekendShifts: true,
    weekdayShifts: false,
    totalShifts: true,
  });

  const holidayDates = useMemo(() => new Set(holidays.map(h => h.date)), [holidays]);

  // Extract unique departments dynamically
  const departments = useMemo(() => {
    const list = new Set(staff.map(s => s.department).filter(Boolean));
    return ["ALL", ...Array.from(list)];
  }, [staff]);

  // Compute detailed statistics for staff inside selected interval
  const calculatedStats = useMemo(() => {
    return staff.map(s => {
      // Find shifts of current member within date range
      const staffShifts = shifts.filter(shift => {
        const isAssigned = shift.assignments.some(a => a.staffId === s.id);
        if (!isAssigned) return false;

        try {
          return isWithinInterval(parseISO(shift.date), { 
            start: parseISO(dateRange.start), 
            end: parseISO(dateRange.end) 
          });
        } catch (e) {
          return false;
        }
      });

      const monthlyCounts: Record<string, string[]> = {};
      let holidayCount = 0;
      let weekendCount = 0;
      let weekdayCount = 0;

      staffShifts.forEach(shift => {
        const dateObj = parseISO(shift.date);
        
        // Month key formatted as MM/yyyy
        const monthKey = format(dateObj, "MM/yyyy");
        if (!monthlyCounts[monthKey]) monthlyCounts[monthKey] = [];
        monthlyCounts[monthKey].push(format(dateObj, "dd"));
        
        // Count holiday shifts
        if (holidayDates.has(shift.date)) {
          holidayCount++;
        }

        // Count weekend vs weekday shifts (0 = Sunday, 6 = Saturday)
        const dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendCount++;
        } else {
          weekdayCount++;
        }
      });

      // Sort dates numerically within each month
      Object.keys(monthlyCounts).forEach(month => {
        monthlyCounts[month].sort((a, b) => parseInt(a) - parseInt(b));
      });

      return {
        ...s,
        totalShifts: staffShifts.length,
        holidayCount,
        weekendCount,
        weekdayCount,
        monthlyCounts,
      };
    });
  }, [staff, shifts, holidayDates, dateRange]);

  // Apply search term, department filtration and sorting
  const stats = useMemo(() => {
    let filtered = calculatedStats.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = selectedDept === "ALL" || s.department === selectedDept;

      return matchSearch && matchDept;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "total-desc") return b.totalShifts - a.totalShifts;
      if (sortBy === "total-asc") return a.totalShifts - b.totalShifts;
      if (sortBy === "holiday-desc") return b.holidayCount - a.holidayCount;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name, "vi");
      if (sortBy === "dept-asc") return (a.department || "").localeCompare(b.department || "", "vi");
      return 0;
    });

    return filtered;
  }, [calculatedStats, searchTerm, selectedDept, sortBy]);

  // Predefined ranges quick handler
  const handlePredefinedRange = (rangeType: "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "allTime") => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (rangeType) {
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case "thisQuarter":
        start = startOfQuarter(today);
        end = endOfQuarter(today);
        break;
      case "thisYear":
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case "allTime":
      default:
        // default default: show past 6 months to current month
        start = subMonths(today, 5);
        end = endOfMonth(today);
        break;
    }

    setDateRange({
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    });
  };

  // Grouped stats structure if groupByDept is toggled
  const groupedStats = useMemo(() => {
    if (!groupByDept) return null;
    const groups: Record<string, typeof stats> = {};
    stats.forEach(s => {
      const d = s.department || "Nhóm khác";
      if (!groups[d]) groups[d] = [];
      groups[d].push(s);
    });
    return groups;
  }, [stats, groupByDept]);

  const chartData = useMemo(() => {
    return calculatedStats
      .filter(s => s.totalShifts > 0)
      .slice(0, 10)
      .map(s => ({
        name: s.code,
        fullName: s.name,
        total: s.totalShifts,
        holiday: s.holidayCount
      }))
      .sort((a, b) => b.total - a.total);
  }, [calculatedStats]);

  // Export statistics to customizable spreadsheet
  const handleExportCustomExcel = () => {
    const cols: { key: string; label: string }[] = [];
    if (visibleColumns.name) cols.push({ key: "name", label: "Họ và tên" });
    if (visibleColumns.code) cols.push({ key: "code", label: "Tên quy ước" });
    if (visibleColumns.department) cols.push({ key: "department", label: "Phòng ban" });
    if (visibleColumns.monthlyBreakdown) cols.push({ key: "monthlyBreakdown", label: "Trực theo tháng (ca)" });
    if (visibleColumns.holidayShifts) cols.push({ key: "holidayShifts", label: "Ngày trực lễ" });
    if (visibleColumns.weekendShifts) cols.push({ key: "weekendShifts", label: "Trực cuối tuần" });
    if (visibleColumns.weekdayShifts) cols.push({ key: "weekdayShifts", label: "Trực ngày thường" });
    if (visibleColumns.totalShifts) cols.push({ key: "totalShifts", label: "Tổng số ngày trực" });

    let exportData: any[] = [];

    // Title Row
    exportData.push({ "Họ và tên": "BÁO CÁO THỐNG KÊ LỊCH TRỰC CHI TIẾT" });
    exportData.push({ "Họ và tên": `Giai đoạn thống kê: từ ${format(parseISO(dateRange.start), "dd/MM/yyyy")} đến ${format(parseISO(dateRange.end), "dd/MM/yyyy")}` });
    exportData.push({}); // spacing

    if (groupByDept) {
      const grouped = (groupedStats || {}) as Record<string, typeof stats>;
      Object.entries(grouped).forEach(([dpt, members]) => {
        // Section header
        exportData.push({
          "Họ và tên": `--- PHÒNG BAN: ${dpt.toUpperCase()} (${members.length} nhân viên) ---`,
        });

        members.forEach(m => {
          const row: any = {};
          cols.forEach(col => {
            if (col.key === "monthlyBreakdown") {
              const breakdown = Object.entries(m.monthlyCounts as Record<string, string[]>)
                .map(([mKey, dKey]) => `${mKey}: ${dKey.length} ca (${dKey.join(", ")})`)
                .join(" | ");
              row[col.label] = breakdown || "Không có ca trực";
            } else if (col.key === "holidayShifts") {
              row[col.label] = m.holidayCount;
            } else if (col.key === "weekendShifts") {
              row[col.label] = m.weekendCount;
            } else if (col.key === "weekdayShifts") {
              row[col.label] = m.weekdayCount;
            } else if (col.key === "totalShifts") {
              row[col.label] = m.totalShifts;
            } else {
              row[col.label] = (m as any)[col.key] || "Chưa thiết lập";
            }
          });
          exportData.push(row);
        });
        exportData.push({}); // spacing
      });
    } else {
      stats.forEach(m => {
        const row: any = {};
        cols.forEach(col => {
          if (col.key === "monthlyBreakdown") {
            const breakdown = Object.entries(m.monthlyCounts as Record<string, string[]>)
              .map(([mKey, dKey]) => `${mKey}: ${dKey.length} ca (${dKey.join(", ")})`)
              .join(" | ");
            row[col.label] = breakdown || "Không có ca trực";
          } else if (col.key === "holidayShifts") {
            row[col.label] = m.holidayCount;
          } else if (col.key === "weekendShifts") {
            row[col.label] = m.weekendCount;
          } else if (col.key === "weekdayShifts") {
            row[col.label] = m.weekdayCount;
          } else if (col.key === "totalShifts") {
            row[col.label] = m.totalShifts;
          } else {
            row[col.label] = (m as any)[col.key] || "Chưa thiết lập";
          }
        });
        exportData.push(row);
      });
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BcaoThongKe");
    XLSX.writeFile(wb, `Bao_cao_thong_ke_truc_${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast.success("Bản tính thống kê đã được tạo và tải xuống thành công!");
  };

  // Trigger quick window print
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 print:hidden">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">Tổng hợp dữ liệu & Báo cáo</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Xem nhanh thông báo, tình hình trực chung và thiết lập báo cáo phân tích.</p>
          </div>
          
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border dark:border-slate-800">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                activeTab === "overview" 
                  ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              Bảng tin & Chỉ số chung
            </button>
            <button
              onClick={() => setActiveTab("custom-report")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all",
                activeTab === "custom-report" 
                  ? "bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <TableProperties className="h-3.5 w-3.5" />
              Báo cáo tùy chỉnh (Mới)
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW & ANNOUNCEMENT */}
        {activeTab === "overview" && (
          <div className="space-y-6 print:hidden">
            {/* Announcement Board Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 displayName italic">By {a.authorName}</span>
                          {a.type === "URGENT" && <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 text-[8px] h-4 px-1 border-none font-bold">Khẩn</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-slate-50 dark:bg-slate-900/50 border-dashed dark:border-slate-800">
                  <CardContent className="p-6 text-center text-slate-500 text-sm">
                    Chưa có thông báo nào trên bảng tin.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* General charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 dark:bg-slate-900 dark:border-slate-800">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-sm font-semibold dark:text-slate-200">Biểu đồ ca trực</CardTitle>
                    <CardDescription className="text-xs">Top 10 nhân viên trực tích cực trong giai đoạn được lọc</CardDescription>
                  </div>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="h-[220px] w-full min-h-[200px]">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                          <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
                          <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#94a3b8" />
                          <RechartsTooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 text-white p-3 border border-slate-700 rounded-lg shadow-xl text-xs space-y-1">
                                    <p className="font-bold border-b border-slate-800 pb-1">{payload[0].payload.fullName}</p>
                                    <p className="text-blue-400 font-medium">Tổng trực: {payload[0].value} ca</p>
                                    <p className="text-orange-400 font-medium">Trực lễ: {payload[1].value} ca</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Tổng ca trực" />
                          <Bar dataKey="holiday" fill="#f97316" radius={[4, 4, 0, 0]} name="Trực lễ" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                        Không có dữ liệu ca trực trong giai đoạn thống kê để hiển thị biểu đồ.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Filters for quick glance */}
              <Card className="dark:bg-slate-900 dark:border-slate-800 flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold dark:text-slate-200">Khoảng thời gian thống kê nhanh</CardTitle>
                  <CardDescription className="text-xs">Quét nhanh dữ liệu trong các khung thời gian định sẵn</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-grow">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handlePredefinedRange("thisMonth")} className="h-8 text-xs font-medium dark:bg-slate-950 dark:border-slate-800">Tháng này</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePredefinedRange("lastMonth")} className="h-8 text-xs font-medium dark:bg-slate-950 dark:border-slate-800">Tháng trước</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePredefinedRange("thisQuarter")} className="h-8 text-xs font-medium dark:bg-slate-950 dark:border-slate-800">Quý này</Button>
                    <Button variant="outline" size="sm" onClick={() => handlePredefinedRange("thisYear")} className="h-8 text-xs font-medium dark:bg-slate-950 dark:border-slate-800">Cả năm nay</Button>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tùy chọn khoảng ngày</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Từ ngày</span>
                        <Input 
                          type="date" 
                          className="h-8 text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                          value={dateRange.start} 
                          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground">Đến ngày</span>
                        <Input 
                          type="date" 
                          className="h-8 text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                          value={dateRange.end} 
                          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhân viên & Tên quy ước</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input 
                        placeholder="Tìm kiếm theo tên/mã..." 
                        className="pl-8 h-8 text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Summary Table */}
            <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/20 border-b dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">BẢNG TÓM TẮT SỐ CA TRỰC ({stats.length} nhân viên)</span>
                <span className="text-[10px] font-mono text-slate-400">Từ {format(parseISO(dateRange.start), "dd/MM")} đến {format(parseISO(dateRange.end), "dd/MM")}</span>
              </div>
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40">
                  <TableRow className="dark:border-slate-800">
                    <TableHead className="dark:text-slate-300 font-bold">Họ và tên</TableHead>
                    <TableHead className="dark:text-slate-300 font-bold">Tên viết tắt</TableHead>
                    <TableHead className="dark:text-slate-300 font-bold">Lịch phân bổ theo tháng</TableHead>
                    <TableHead className="text-center dark:text-slate-300 font-bold">Trực lễ</TableHead>
                    <TableHead className="text-center dark:text-slate-300 font-bold">Tổng ca trực</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s) => (
                    <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors dark:border-slate-800">
                      <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{s.name}</TableCell>
                      <TableCell className="text-blue-600 dark:text-blue-400 font-mono font-bold">{s.code}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(s.monthlyCounts as Record<string, string[]>).map(([month, dates]) => (
                            <div key={month}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center justify-center cursor-help bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 text-xs font-semibold rounded-md transition-all h-5">
                                    Tháng {month}: {dates.length} ca
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="p-3 bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 text-white max-w-sm rounded-lg shadow-xl" side="top">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                      <CalendarIcon className="h-4 w-4 text-blue-400" />
                                      <span className="font-bold text-xs text-slate-200">Chi tiết phân bổ tháng {month}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400">Nhân viên: <strong className="text-slate-100">{s.name}</strong> ({s.code})</p>
                                    <p className="text-[11px] text-slate-400">Tổng số ngày đã trực: <strong className="text-white">{dates.length} ngày</strong> trong tháng này:</p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {dates.map(day => (
                                        <span key={day} className="text-[10px] bg-slate-800 dark:bg-slate-900 px-2 py-0.5 rounded font-mono border border-slate-700 dark:border-slate-800 text-blue-300">
                                          Ngày {day}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          ))}
                          {Object.keys(s.monthlyCounts).length === 0 && (
                            <span className="text-[11px] text-muted-foreground italic">Không có ca trực</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:border dark:border-orange-900/50 text-orange-700 hover:bg-orange-100/80 border-none px-2 py-0.5 rounded-md font-semibold">
                          {s.holidayCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-600 dark:hover:bg-blue-800 border-none px-2.5 py-0.5 font-bold rounded-md shadow-sm">
                          {s.totalShifts}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Không tìm thấy dữ liệu hoặc chưa bố trí lịch trực.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* TAB 2: RICH CUSTOMIZABLE REPORT DESIGN MODULE */}
        {(activeTab === "custom-report" || activeTab === "print-view") && (
          <div className="space-y-6">
            
            {/* CONFIGURATION DRAWER/PANEL PORT */}
            <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm print:hidden">
              <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <CardTitle className="text-sm font-bold dark:text-slate-100">BỘ CÔNG CỤ TÙY BIẾN BẢNG THỐNG KÊ BÁO CÁO</CardTitle>
                  <CardDescription className="text-xs">Tự do chỉnh sửa, gom nhóm, ẩn hiện các chỉ số và tải về bảng tính Excel.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                
                {/* Checkboxes row: custom columns toggle */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">1. Ẩn/Hiện Cột dữ liệu thống kê</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.name} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, name: !!checked })}
                      />
                      Họ và Tên
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.code} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, code: !!checked })}
                      />
                      Tên quy ước
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.department} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, department: !!checked })}
                      />
                      Phòng ban
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.monthlyBreakdown} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, monthlyBreakdown: !!checked })}
                      />
                      Xem phân bố tháng
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.holidayShifts} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, holidayShifts: !!checked })}
                      />
                      Trực ngày Lễ
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.weekendShifts} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, weekendShifts: !!checked })}
                      />
                      Trực thứ 7 & CN
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.weekdayShifts} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, weekdayShifts: !!checked })}
                      />
                      Trực ngày thường
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                      <Checkbox 
                        checked={visibleColumns.totalShifts} 
                        onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, totalShifts: !!checked })}
                      />
                      Tổng số ca trực
                    </label>
                  </div>
                </div>

                {/* Filters grid for advanced reporting */}
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                  
                  {/* Select Department filter */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Lọc theo phòng ban</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-950 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-md py-1.5 px-3 h-9 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="ALL">Tất cả phòng ban</option>
                      {departments.filter(d => d !== "ALL").map(d => (
                        <option value={d} key={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date range picker - specific */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Chọn khoảng thời gian</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input 
                        type="date" 
                        className="h-9 text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200"
                        value={dateRange.start} 
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      />
                      <Input 
                        type="date" 
                        className="h-9 text-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-205"
                        value={dateRange.end} 
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Sort criteria select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Sắp xếp dữ liệu</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-slate-950 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-md py-1.5 px-3 h-9 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="total-desc">Tổng ca trực (Giảm dần)</option>
                      <option value="total-asc">Tổng ca trực (Tăng dần)</option>
                      <option value="holiday-desc">Trực ngày lễ (Giảm dần)</option>
                      <option value="name-asc">Họ tên nhân viên (A-Z)</option>
                      <option value="dept-asc">Theo phòng ban (A-Z)</option>
                    </select>
                  </div>

                  {/* Gom nhóm toggler */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Gom nhóm báo cáo</label>
                    <Button
                      variant={groupByDept ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGroupByDept(!groupByDept)}
                      className={cn(
                        "h-9 text-xs font-semibold justify-start border-slate-200 dark:border-slate-800",
                        groupByDept ? "bg-blue-600 hover:bg-blue-700 text-white" : ""
                      )}
                    >
                      <Layers className="h-4 w-4 mr-2" />
                      {groupByDept ? "Đang gom phòng ban" : "Không gom nhóm"}
                    </Button>
                  </div>
                </div>

                {/* Reporting and Action items */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex gap-2">
                    <Button variant="outline" size="xs" onClick={() => handlePredefinedRange("thisMonth")} className="h-7 text-[10px] dark:border-slate-800">Tháng này</Button>
                    <Button variant="outline" size="xs" onClick={() => handlePredefinedRange("lastMonth")} className="h-7 text-[10px] dark:border-slate-800">Tháng trước</Button>
                    <Button variant="outline" size="xs" onClick={() => handlePredefinedRange("thisQuarter")} className="h-7 text-[10px] dark:border-slate-800">Quý này</Button>
                    <Button variant="outline" size="xs" onClick={() => handlePredefinedRange("allTime")} className="h-7 text-[10px] dark:border-slate-800">Xem xa hơn</Button>
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintReport}
                      className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 dark:bg-slate-950"
                    >
                      <Printer className="h-3.5 w-3.5 mr-1" />
                      In báo cáo (PDF)
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleExportCustomExcel}
                      className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
                      Tải file Excel báo cáo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MAIN RENDER DATA TABLE */}
            <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md overflow-hidden relative print:border-none print:shadow-none">
              
              {/* Header inside print structure */}
              <div className="p-6 bg-slate-50 dark:bg-slate-800/20 border-b dark:border-slate-800 flex flex-col items-center text-center gap-1">
                <h1 className="text-md sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-50 uppercase leading-none">Bảng Thống Kê Phân Công Lịch Trực</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Thời gian thống kê: Từ ngày {format(parseISO(dateRange.start), "dd/MM/yyyy")} đến ngày {format(parseISO(dateRange.end), "dd/MM/yyyy")}
                </p>
                {selectedDept !== "ALL" && (
                  <p className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/50 mt-1 font-semibold">
                    Lọc phòng ban: {selectedDept}
                  </p>
                )}
              </div>

              {groupByDept ? (
                // Group view logic
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries((groupedStats || {}) as Record<string, typeof stats>).map(([deptName, listMembers]) => (
                    <div key={deptName} className="p-0">
                      
                      {/* Department Segment Header */}
                      <div className="bg-slate-100/50 dark:bg-slate-950 px-4 py-2.5 font-bold text-xs uppercase flex items-center justify-between text-blue-700 dark:text-blue-400 border-y border-slate-200 dark:border-slate-800">
                        <span className="flex items-center gap-1.5">
                          <ChevronRight className="h-3.5 w-3.5" />
                          Phòng ban: {deptName}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold lowercase">({listMembers.length} nhân viên)</span>
                      </div>

                      <Table>
                        <CustomTableHeader visibleColumns={visibleColumns} />
                        <TableBody>
                          {listMembers.map((s) => (
                            <CustomTableRow key={s.id} s={s} visibleColumns={visibleColumns} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                  {Object.keys((groupedStats || {}) as Record<string, typeof stats>).length === 0 && (
                    <div className="p-8 text-center text-xs text-muted-foreground italic">
                      Không tìm thấy dữ liệu thống kê phù hợp.
                    </div>
                  )}
                </div>
              ) : (
                // Direct tabular view
                <Table>
                  <CustomTableHeader visibleColumns={visibleColumns} />
                  <TableBody>
                    {stats.map((s) => (
                      <CustomTableRow key={s.id} s={s} visibleColumns={visibleColumns} />
                    ))}
                    {stats.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground italic">
                          Không tìm thấy thông tin hoặc danh sách nhân viên rỗng. Hãy kiểm tra các lựa chọn bộ lọc.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Instruction for reports */}
            <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800 print:hidden text-xs text-slate-500 dark:text-slate-400">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-350">Hướng dẫn sử dụng báo cáo chuyên sâu:</p>
                <ul className="list-disc list-inside space-y-1 mt-1 text-[11px]">
                  <li>Sử dụng chức năng <strong>"Ẩn/Hiện Cột"</strong> để giấu các chỉ số không mong muốn trước khi tải về file Excel hoặc In trực tiếp.</li>
                  <li>Lựa chọn <strong>"Gom nhóm"</strong> hỗ trợ phân tách nhân lực theo khoa/phòng để dễ quản lý.</li>
                  <li>Bạn có thể di chuột vào các ca trực theo tháng để xem chi tiết lịch của người đó mà không cần mở lịch tổng.</li>
                </ul>
              </div>
            </div>

          </div>
        )}

      </div>
    </TooltipProvider>
  );
}

/* SUBCOMPONENT: TABLE HEADER GENERATION WITH DYNAMIC FLAGS */
interface CustomTableHeaderProps {
  visibleColumns: {
    name: boolean;
    code: boolean;
    department: boolean;
    monthlyBreakdown: boolean;
    holidayShifts: boolean;
    weekendShifts: boolean;
    weekdayShifts: boolean;
    totalShifts: boolean;
  };
}

function CustomTableHeader({ visibleColumns }: CustomTableHeaderProps) {
  return (
    <TableHeader className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
      <TableRow className="hover:bg-transparent dark:border-slate-800">
        {visibleColumns.name && <TableHead className="dark:text-slate-200 font-bold">Họ và Tên</TableHead>}
        {visibleColumns.code && <TableHead className="dark:text-slate-200 font-bold w-[120px]">Tên viết tắt</TableHead>}
        {visibleColumns.department && <TableHead className="dark:text-slate-200 font-bold">Khoa / Phòng</TableHead>}
        {visibleColumns.monthlyBreakdown && <TableHead className="dark:text-slate-200 font-bold min-w-[200px]">Ca trực theo tháng</TableHead>}
        {visibleColumns.holidayShifts && <TableHead className="text-center dark:text-slate-200 font-bold w-[100px]">Trực lễ</TableHead>}
        {visibleColumns.weekendShifts && <TableHead className="text-center dark:text-slate-200 font-bold w-[120px]">Trực cuối tuần (T7/CN)</TableHead>}
        {visibleColumns.weekdayShifts && <TableHead className="text-center dark:text-slate-200 font-bold w-[120px]">Trực Thứ 2 - T6</TableHead>}
        {visibleColumns.totalShifts && <TableHead className="text-center dark:text-slate-200 font-bold w-[120px]">Tổng số ca</TableHead>}
      </TableRow>
    </TableHeader>
  );
}

/* SUBCOMPONENT: ROW RENDERING FOR STAFF MEMBER */
interface CustomTableRowProps {
  key?: string | number;
  s: any;
  visibleColumns: {
    name: boolean;
    code: boolean;
    department: boolean;
    monthlyBreakdown: boolean;
    holidayShifts: boolean;
    weekendShifts: boolean;
    weekdayShifts: boolean;
    totalShifts: boolean;
  };
}

function CustomTableRow({ s, visibleColumns }: CustomTableRowProps) {
  return (
    <TableRow className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 dark:border-slate-800">
      
      {/* 1. Member Name */}
      {visibleColumns.name && (
        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 leading-tight">
          {s.name}
        </TableCell>
      )}

      {/* 2. Conventional writing code */}
      {visibleColumns.code && (
        <TableCell className="text-blue-600 dark:text-blue-400 font-mono font-bold">
          {s.code}
        </TableCell>
      )}

      {/* 3. Department status */}
      {visibleColumns.department && (
        <TableCell className="text-slate-600 dark:text-slate-400 text-xs font-semibold">
          {s.department || <span className="italic text-slate-400 font-normal">Chưa gán</span>}
        </TableCell>
      )}

      {/* 4. Monthly breakdowns with instant detailed interactive tooltip */}
      {visibleColumns.monthlyBreakdown && (
        <TableCell>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(s.monthlyCounts as Record<string, string[]>).map(([month, dates]) => (
              <div key={month}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center justify-center cursor-help bg-blue-50/75 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 text-xs font-semibold rounded-md transition-all h-5">
                      T{month}: {dates.length} ca
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="p-3 bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-850 text-white max-w-sm rounded-lg shadow-xl" side="top">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                        <CalendarIcon className="h-4 w-4 text-blue-400" />
                        <span className="font-bold text-xs text-slate-200">Chi tiết trực tháng {month}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Điều dưỡng: <strong className="text-slate-100">{s.name}</strong> ({s.code})</p>
                      <p className="text-[11px] text-slate-400">Các ngày đã trực trong giai đoạn lọc (<strong className="text-white">{dates.length} ca</strong>):</p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {dates.map(day => (
                          <span key={day} className="text-[10px] bg-slate-800 dark:bg-slate-900 px-2 py-0.5 rounded font-mono border border-slate-700 dark:border-slate-800 text-blue-300">
                            Ngày {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
            {Object.keys(s.monthlyCounts).length === 0 && (
              <span className="text-[10px] text-muted-foreground italic">Không có ca trực</span>
            )}
          </div>
        </TableCell>
      )}

      {/* 5. Holiday shifts counts */}
      {visibleColumns.holidayShifts && (
        <TableCell className="text-center">
          <Badge className="bg-orange-100 dark:bg-orange-950 dark:text-orange-400 dark:border dark:border-orange-900/50 text-orange-700 px-2 py-0.5 rounded-md font-semibold">
            {s.holidayCount}
          </Badge>
        </TableCell>
      )}

      {/* 6. Weekend shifts counts */}
      {visibleColumns.weekendShifts && (
        <TableCell className="text-center font-semibold text-slate-700 dark:text-slate-300 text-xs">
          {s.weekendCount} ca
        </TableCell>
      )}

      {/* 7. Weekday shifts counts */}
      {visibleColumns.weekdayShifts && (
        <TableCell className="text-center font-semibold text-slate-600 dark:text-slate-400 text-xs">
          {s.weekdayCount} ca
        </TableCell>
      )}

      {/* 8. Cumulative final shift count */}
      {visibleColumns.totalShifts && (
        <TableCell className="text-center">
          <Badge className="bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-600 dark:hover:bg-blue-800 px-2.5 py-0.5 font-bold rounded shadow-sm">
            {s.totalShifts}
          </Badge>
        </TableCell>
      )}

    </TableRow>
  );
}
