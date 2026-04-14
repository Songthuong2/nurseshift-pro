/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Holiday, Staff, Shift } from "@/src/types";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Plus, Trash2, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface HolidayManagementProps {
  holidays: Holiday[];
  staff: Staff[];
  shifts: Shift[];
  onAddHoliday: (holiday: Holiday) => void;
  onDeleteHoliday: (id: string) => void;
}

export default function HolidayManagement({
  holidays = [],
  staff = [],
  shifts = [],
  onAddHoliday,
  onDeleteHoliday,
}: HolidayManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Holiday>>({
    date: format(new Date(), "yyyy-MM-dd"),
    isLunar: false,
  });

  const handleSave = () => {
    if (!formData.name || !formData.date) {
      toast.error("Vui lòng nhập tên và ngày nghỉ lễ");
      return;
    }

    onAddHoliday({
      id: crypto.randomUUID(),
      name: formData.name,
      date: formData.date,
      isLunar: formData.isLunar || false,
      lunarDate: formData.lunarDate,
      note: formData.note,
    } as Holiday);

    toast.success("Đã thêm ngày nghỉ lễ");
    setIsDialogOpen(false);
    setFormData({ date: format(new Date(), "yyyy-MM-dd"), isLunar: false });
  };

  const getStaffOnShift = (date: string) => {
    const shift = shifts.find((s) => s.date === date);
    if (!shift) return [];
    return shift.assignments
      .map((a) => staff.find((s) => s.id === a.staffId)?.name)
      .filter(Boolean);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800">Danh sách ngày nghỉ lễ</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={<Button className="bg-orange-600 hover:bg-orange-700" />}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm ngày nghỉ
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm ngày nghỉ lễ mới</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">Tên ngày lễ</label>
                <Input
                  className="col-span-3"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Tết Nguyên Đán"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">Ngày (Dương)</label>
                <Input
                  type="date"
                  className="col-span-3"
                  value={formData.date || ""}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">Ngày (Âm)</label>
                <Input
                  className="col-span-3"
                  value={formData.lunarDate || ""}
                  onChange={(e) => setFormData({ ...formData, lunarDate: e.target.value })}
                  placeholder="Ví dụ: 01/01"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">Ghi chú</label>
                <Input
                  className="col-span-3"
                  value={formData.note || ""}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">Lưu</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[150px]">Ngày Dương lịch</TableHead>
              <TableHead className="w-[120px]">Ngày Âm lịch</TableHead>
              <TableHead>Tên ngày nghỉ</TableHead>
              <TableHead>Nhân viên trực</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.sort((a, b) => a.date.localeCompare(b.date)).map((h) => {
              const staffOnShift = getStaffOnShift(h.date);
              return (
                <TableRow key={h.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium">
                    {format(parseISO(h.date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {h.lunarDate ? <Badge variant="secondary">{h.lunarDate}</Badge> : "-"}
                  </TableCell>
                  <TableCell className="font-semibold text-orange-700">{h.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {staffOnShift.length > 0 ? (
                        staffOnShift.map((name, idx) => (
                          <Badge key={idx} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Chưa có lịch trực</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{h.note || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onDeleteHoliday(h.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {holidays.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Chưa có ngày nghỉ lễ nào được lưu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3 items-start">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Gợi ý:</p>
          <p>Bạn có thể tự tìm kiếm các ngày lễ Âm lịch Việt Nam và nhập vào danh sách này để hệ thống tự động thống kê số ngày trực lễ cho nhân viên.</p>
        </div>
      </div>
    </div>
  );
}
