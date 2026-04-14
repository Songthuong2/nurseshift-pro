/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Staff, Shift, Holiday, ShiftAssignment } from "@/src/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addDays, subDays, addMonths, subMonths, differenceInDays, parseISO, isWithinInterval, isSameDay, parse } from "date-fns";
import { vi } from "date-fns/locale";
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, LayoutGrid, List, GripVertical, Wand2, Save, Download, Upload, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ShiftSchedulerProps {
  staff: Staff[];
  shifts: Shift[];
  holidays: Holiday[];
  onSaveShifts: (updatedShifts: Shift[]) => void;
}

export default function ShiftScheduler({
  staff,
  shifts,
  holidays,
  onSaveShifts,
}: ShiftSchedulerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("month");
  const [nursesPerDay, setNursesPerDay] = useState(3);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localShifts, setLocalShifts] = useState<Shift[]>(shifts || []);

  // Sync local shifts when props change
  useEffect(() => {
    setLocalShifts(shifts || []);
  }, [shifts]);

  const isDirty = useMemo(() => {
    return JSON.stringify(localShifts) !== JSON.stringify(shifts);
  }, [localShifts, shifts]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const visibleDays = useMemo(() => {
    if (viewMode === "month") {
      return eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      });
    } else {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      });
    }
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    setCurrentDate(prev => viewMode === "month" ? subMonths(prev, 1) : subDays(prev, 7));
  };

  const handleNext = () => {
    setCurrentDate(prev => viewMode === "month" ? addMonths(prev, 1) : addDays(prev, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleAutoSchedule = () => {
    // 1. Prepare data
    const staffStats = staff.map(s => {
      // Find last shift before the visible period
      const lastShiftBefore = localShifts
        .filter(sh => parseISO(sh.date) < visibleDays[0])
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
        .find(sh => sh.assignments.some(a => a.staffId === s.id));
      
      return {
        id: s.id,
        target: s.targetShifts || 8,
        count: 0, // Count in current period
        lastDate: lastShiftBefore ? parseISO(lastShiftBefore.date) : null,
        unavailableDays: s.unavailableDays || []
      };
    });

    const updatedShifts: Shift[] = [...localShifts];

    // 2. Iterate through days
    visibleDays.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayOfWeek = day.getDay();
      
      // Filter available staff
      const availableStaff = staffStats.filter(s => 
        !s.unavailableDays.includes(dayOfWeek)
      );

      // Sort by priority:
      // 1. Distance from last shift (descending)
      // 2. Remaining shifts to target (descending)
      availableStaff.sort((a, b) => {
        const distA = a.lastDate ? differenceInDays(day, a.lastDate) : 999;
        const distB = b.lastDate ? differenceInDays(day, b.lastDate) : 999;
        
        if (distA !== distB) return distB - distA;
        
        const remA = a.target - a.count;
        const remB = b.target - b.count;
        return remB - remA;
      });

      // Pick top nursesPerDay
      const selected = availableStaff.slice(0, nursesPerDay);
      const assignments = selected.map(s => {
        // Update stats
        s.count++;
        s.lastDate = day;
        return { staffId: s.id };
      });

      // Fill empty slots if not enough staff
      while (assignments.length < nursesPerDay) {
        assignments.push({ staffId: "" });
      }

      const existingIdx = updatedShifts.findIndex(s => s.date === dateStr);
      if (existingIdx >= 0) {
        updatedShifts[existingIdx] = { ...updatedShifts[existingIdx], assignments };
      } else {
        updatedShifts.push({ id: crypto.randomUUID(), date: dateStr, assignments });
      }
    });

    setLocalShifts(updatedShifts);
    toast.info("Đã sắp lịch tạm thời. Nhấn 'Lưu lại' để áp dụng chính thức.");
  };

  const handleExportExcel = () => {
    const data = visibleDays.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const currentShift = localShifts.find(s => s.date === dateStr);
      const row: any = {
        "Ngày": format(day, "dd/MM/yyyy"),
        "Thứ": format(day, "EEEE", { locale: vi }),
      };

      for (let i = 0; i < nursesPerDay; i++) {
        const staffId = currentShift?.assignments[i]?.staffId;
        const s = staff.find(st => st.id === staffId);
        row[`Điều dưỡng ${i + 1}`] = s ? s.code : "";
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LichTruc");
    XLSX.writeFile(wb, `Lich_Truc_${format(currentDate, "MM_yyyy")}.xlsx`);
    toast.success("Đã xuất lịch trực sang Excel!");
  };
  
  const handleImportExcel = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws) as any[];
          
          const updatedShifts: Shift[] = [...localShifts];
          
          data.forEach(row => {
            const dateStr = row["Ngày"];
            if (!dateStr) return;
            
            // Parse dd/MM/yyyy
            const parsedDate = parse(dateStr, "dd/MM/yyyy", new Date());
            const isoDate = format(parsedDate, "yyyy-MM-dd");
            
            const assignments: ShiftAssignment[] = [];
            for (let i = 0; i < nursesPerDay; i++) {
              const staffCode = row[`Điều dưỡng ${i + 1}`];
              const s = staff.find(st => st.code === staffCode);
              assignments.push({ staffId: s ? s.id : "" });
            }
            
            const existingIdx = updatedShifts.findIndex(s => s.date === isoDate);
            if (existingIdx >= 0) {
              updatedShifts[existingIdx] = { ...updatedShifts[existingIdx], assignments };
            } else {
              updatedShifts.push({ id: crypto.randomUUID(), date: isoDate, assignments });
            }
          });
          
          setLocalShifts(updatedShifts);
          toast.info(`Đã tải lên ${data.length} ngày. Nhấn 'Lưu lại' để áp dụng.`);
        } catch (error) {
          console.error(error);
          toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng mẫu.");
        }
      };
      reader.readAsBinaryString(file);
    };
    input.click();
  };

  const handleSave = () => {
    onSaveShifts(localShifts);
  };

  const handleReset = () => {
    setLocalShifts(shifts);
    toast.info("Đã hoàn tác các thay đổi chưa lưu.");
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const activeData = active.data.current as { date: string; index: number; staffId: string };
      const overData = over.data.current as { date: string; index: number; staffId: string };

      if (!activeData || !overData) return;

      // Swap or move staff
      const sourceDate = activeData.date;
      const sourceIndex = activeData.index;
      const sourceStaffId = activeData.staffId;

      const targetDate = overData.date;
      const targetIndex = overData.index;
      const targetStaffId = overData.staffId;

      if (sourceDate === targetDate) {
        // Same day swap
        const currentShift = localShifts.find(s => s.date === sourceDate);
        if (currentShift) {
          const newAssignments = [...currentShift.assignments];
          newAssignments[sourceIndex] = { staffId: targetStaffId };
          newAssignments[targetIndex] = { staffId: sourceStaffId };
          
          const newShifts = [...localShifts];
          const idx = newShifts.findIndex(s => s.date === sourceDate);
          newShifts[idx] = { ...newShifts[idx], assignments: newAssignments };
          setLocalShifts(newShifts);
        }
      } else {
        // Different day move
        const sourceShift = localShifts.find(s => s.date === sourceDate);
        const targetShift = localShifts.find(s => s.date === targetDate);

        const newSourceAssignments = sourceShift ? [...sourceShift.assignments] : Array(nursesPerDay).fill({ staffId: "" });
        const newTargetAssignments = targetShift ? [...targetShift.assignments] : Array(nursesPerDay).fill({ staffId: "" });

        newSourceAssignments[sourceIndex] = { staffId: targetStaffId };
        newTargetAssignments[targetIndex] = { staffId: sourceStaffId };

        const newShifts = [...localShifts];
        
        const sIdx = newShifts.findIndex(s => s.date === sourceDate);
        if (sIdx >= 0) {
          newShifts[sIdx] = { ...newShifts[sIdx], assignments: newSourceAssignments };
        } else {
          newShifts.push({ id: crypto.randomUUID(), date: sourceDate, assignments: newSourceAssignments });
        }

        const tIdx = newShifts.findIndex(s => s.date === targetDate);
        if (tIdx >= 0) {
          newShifts[tIdx] = { ...newShifts[tIdx], assignments: newTargetAssignments };
        } else {
          newShifts.push({ id: crypto.randomUUID(), date: targetDate, assignments: newTargetAssignments });
        }

        setLocalShifts(newShifts);
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border dark:border-slate-800 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border dark:border-slate-700">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 text-xs px-3", viewMode === "month" ? "shadow-sm bg-white dark:bg-slate-950 dark:text-slate-100" : "text-muted-foreground")}
                onClick={() => setViewMode("month")}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Tháng
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-8 text-xs px-3", viewMode === "week" ? "shadow-sm bg-white dark:bg-slate-950 dark:text-slate-100" : "text-muted-foreground")}
                onClick={() => setViewMode("week")}
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Tuần
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9 dark:border-slate-700 dark:hover:bg-slate-800" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="h-9 min-w-[140px] font-bold dark:border-slate-700 dark:hover:bg-slate-800" onClick={handleToday}>
                {viewMode === "month" 
                  ? `Tháng ${format(currentDate, "MM/yyyy")}` 
                  : `Tuần ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM")} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM")}`
                }
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9 dark:border-slate-700 dark:hover:bg-slate-800" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoSchedule}
                className="h-9 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Tự động sắp lịch
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExportExcel}
                className="h-9 border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleImportExcel}
                className="h-9 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400"
              >
                <Upload className="h-4 w-4 mr-2" />
                Tải Excel
              </Button>
              {isDirty && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleReset}
                  className="h-9 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Hoàn tác
                </Button>
              )}
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSave}
                className="h-9 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Lưu lại
              </Button>
            </div>

            <div className="flex flex-col gap-1">
              <Select
                value={nursesPerDay.toString()}
                onValueChange={(val) => setNursesPerDay(parseInt(val))}
              >
              <SelectTrigger className="w-[150px] h-9 dark:border-slate-700 dark:bg-slate-900">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Số người" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} Điều dưỡng
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground italic">
            * Nhấn giữ để kéo thả nhân viên sang ngày khác
          </div>
        </div>

        <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="w-[80px] text-center dark:text-slate-300">Ngày</TableHead>
                <TableHead className="w-[120px] dark:text-slate-300">Thứ</TableHead>
                {Array.from({ length: nursesPerDay }).map((_, i) => (
                  <TableHead key={i} className="dark:text-slate-300">Điều dưỡng {i + 1}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const holiday = holidays.find((h) => h.date === dateStr);
                const currentShift = localShifts.find((s) => s.date === dateStr);
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <TableRow 
                    key={dateStr} 
                    className={cn(
                      "hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors h-16",
                      isWeekend && "bg-slate-50/30 dark:bg-slate-800/20",
                      holiday && "bg-orange-50/50 dark:bg-orange-900/10"
                    )}
                  >
                    <TableCell className="text-center font-bold dark:text-slate-200">
                      {format(day, "dd/MM")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={cn(isWeekend ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-600 dark:text-slate-400")}>
                          {format(day, "EEEE", { locale: vi })}
                        </span>
                        {holiday && (
                          <span className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase truncate max-w-[100px]">
                            {holiday.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {Array.from({ length: nursesPerDay }).map((_, i) => {
                      const currentAssignments = currentShift?.assignments || [];
                      const otherSelectedIds = currentAssignments
                        .filter((_, index) => index !== i)
                        .map(a => a.staffId)
                        .filter(id => id !== "");

                      const staffId = currentAssignments[i]?.staffId || "";

                      return (
                        <TableCell key={i} className="p-1">
                          <DraggableNurseSelector
                            id={`${dateStr}-${i}`}
                            staff={staff}
                            selectedId={staffId}
                            excludeIds={otherSelectedIds}
                            shifts={localShifts}
                            currentDateStr={dateStr}
                            index={i}
                            onSelect={(newStaffId) => {
                              const newAssignments = [...currentAssignments];
                              while (newAssignments.length < nursesPerDay) newAssignments.push({ staffId: "" });
                              newAssignments[i] = { staffId: newStaffId };
                              
                              const newShifts = [...localShifts];
                              const idx = newShifts.findIndex(s => s.date === dateStr);
                              if (idx >= 0) {
                                newShifts[idx] = { ...newShifts[idx], assignments: newAssignments };
                              } else {
                                newShifts.push({ id: crypto.randomUUID(), date: dateStr, assignments: newAssignments });
                              }
                              setLocalShifts(newShifts);
                            }}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-2 flex items-center gap-2 opacity-80 scale-105 pointer-events-none">
              <GripVertical className="h-3 w-3 text-slate-400" />
              <span className="text-xs font-medium">
                {staff.find(s => s.id === activeId.split('-')[0])?.code || "Đang kéo..."}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DraggableNurseSelector({
  id,
  staff,
  selectedId,
  excludeIds,
  shifts,
  currentDateStr,
  index,
  onSelect
}: {
  id: string;
  staff: Staff[];
  selectedId: string;
  excludeIds: string[];
  shifts: Shift[];
  currentDateStr: string;
  index: number;
  onSelect: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id,
    data: {
      date: currentDateStr,
      index,
      staffId: selectedId,
    },
    disabled: !selectedId,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative"
    >
      <NurseSelector
        staff={staff}
        selectedId={selectedId}
        excludeIds={excludeIds}
        shifts={shifts}
        currentDateStr={currentDateStr}
        onSelect={onSelect}
        dragHandleProps={selectedId ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

function NurseSelector({ 
  staff, 
  selectedId, 
  excludeIds = [],
  shifts = [],
  currentDateStr,
  onSelect,
  dragHandleProps
}: { 
  staff: Staff[]; 
  selectedId: string; 
  excludeIds?: string[];
  shifts?: Shift[];
  currentDateStr: string;
  onSelect: (id: string) => void;
  dragHandleProps?: any;
}) {
  const [open, setOpen] = useState(false);
  const selectedStaff = staff.find((s) => s.id === selectedId);

  // Check for violations
  const isUnavailable = selectedStaff?.unavailableDays?.includes(parseISO(currentDateStr).getDay());
  const isDuplicate = excludeIds.includes(selectedId);
  const hasViolation = isUnavailable || isDuplicate;

  const getNearestShiftDistance = (staffId: string) => {
    const staffShifts = shifts.filter(s => 
      s.date !== currentDateStr && 
      s.assignments.some(a => a.staffId === staffId)
    );
    
    if (staffShifts.length === 0) return null;

    const current = parseISO(currentDateStr);
    const distances = staffShifts.map(s => Math.abs(differenceInDays(current, parseISO(s.date))));
    return Math.min(...distances);
  };

  const getStaffMonthlyCount = (staffId: string) => {
    const current = parseISO(currentDateStr);
    const start = startOfMonth(current);
    const end = endOfMonth(current);
    
    return shifts.filter(s => 
      s.assignments.some(a => a.staffId === staffId) &&
      isWithinInterval(parseISO(s.date), { start, end })
    ).length;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex items-center justify-between w-full border rounded-md h-9 px-2 text-xs transition-colors",
          !selectedStaff && "text-muted-foreground italic bg-slate-50 dark:bg-slate-900/50",
          selectedStaff && "bg-white dark:bg-slate-900",
          hasViolation && "text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-900/50 dark:bg-red-900/20"
        )}
      >
        <div 
          className={cn(
            "flex-1 truncate py-1", 
            selectedId ? "cursor-grab active:cursor-grabbing" : "cursor-default",
            hasViolation && "font-bold"
          )}
          {...dragHandleProps}
        >
          {selectedStaff ? selectedStaff.code : "Trống"}
        </div>
        
        <PopoverTrigger
          className="h-6 w-6 ml-1 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Tìm tên..." className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty>Không tìm thấy.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onSelect("");
                  setOpen(false);
                }}
                className="text-xs"
              >
                <Check
                  className={cn(
                    "mr-2 h-3 w-3",
                    selectedId === "" ? "opacity-100" : "opacity-0"
                  )}
                />
                (Trống)
              </CommandItem>
              {staff.map((s) => {
                const isExcluded = excludeIds.includes(s.id);
                const distance = getNearestShiftDistance(s.id);
                const monthlyCount = getStaffMonthlyCount(s.id);
                const isUnavailable = s.unavailableDays?.includes(parseISO(currentDateStr).getDay());
                const isOverTarget = s.targetShifts && monthlyCount >= s.targetShifts;
                
                return (
                  <CommandItem
                    key={s.id}
                    value={`${s.code} ${s.name}`}
                    disabled={isExcluded}
                    onSelect={() => {
                      if (!isExcluded) {
                        onSelect(s.id);
                        setOpen(false);
                      }
                    }}
                    className={cn(
                      "text-xs",
                      isExcluded && "opacity-50 cursor-not-allowed bg-slate-50"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 w-3",
                        selectedId === s.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{s.code}</span>
                          {distance !== null && (
                            <span className={cn(
                              "text-[9px] px-1 rounded font-medium",
                              distance < 2 ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400" : 
                              distance < 4 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400" : 
                              "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
                            )}>
                              {distance} ngày
                            </span>
                          )}
                          {isUnavailable && (
                            <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1 rounded font-medium">
                              Lịch nghỉ
                            </span>
                          )}
                          {isOverTarget && (
                            <span className="text-[9px] bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 px-1 rounded font-medium">
                              Đủ ca ({monthlyCount})
                            </span>
                          )}
                        </div>
                        {isExcluded && (
                          <span className="text-[9px] bg-slate-200 px-1 rounded text-slate-500">Đã chọn</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">{s.name}</span>
                        {s.notes && (
                          <span className="text-[9px] text-slate-400 italic truncate max-w-[80px]">
                            {s.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
