/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Staff } from "@/src/types";
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
import { Search, UserPlus, FileUp, Edit, Trash2, Info } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS_OF_WEEK = [
  { id: 1, label: "T2" },
  { id: 2, label: "T3" },
  { id: 3, label: "T4" },
  { id: 4, label: "T5" },
  { id: 5, label: "T6" },
  { id: 6, label: "T7" },
  { id: 0, label: "CN" },
];

interface StaffManagementProps {
  staff: Staff[];
  onAddStaff: (staff: Staff) => void;
  onUpdateStaff: (staff: Staff) => void;
  onDeleteStaff: (id: string) => void;
  onImportStaff: (staffList: Staff[]) => void;
}

export default function StaffManagement({
  staff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onImportStaff,
}: StaffManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<Partial<Staff>>({});

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name || !formData.code) {
      toast.error("Vui lòng nhập tên và mã nhân viên");
      return;
    }

    if (editingStaff) {
      onUpdateStaff({ ...editingStaff, ...formData } as Staff);
      toast.success("Đã cập nhật thông tin nhân viên");
    } else {
      onAddStaff({
        id: crypto.randomUUID(),
        name: formData.name,
        code: formData.code,
        department: formData.department || "Điều dưỡng",
        phone: formData.phone,
        email: formData.email,
      } as Staff);
      toast.success("Đã thêm nhân viên mới");
    }
    setIsDialogOpen(false);
    setEditingStaff(null);
    setFormData({});
  };

  const handleEdit = (s: Staff) => {
    setEditingStaff(s);
    setFormData(s);
    setIsDialogOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        
        const wb = XLSX.read(data, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        if (jsonData.length === 0) {
          toast.error("File Excel không có dữ liệu hoặc sai định dạng");
          return;
        }

        const importedStaff: Staff[] = jsonData.map((row) => {
          // Helper to find value by case-insensitive key or common variations
          const getValue = (keys: string[]) => {
            const rowKey = Object.keys(row).find(k => 
              keys.some(key => k.toLowerCase().trim() === key.toLowerCase().trim())
            );
            return rowKey ? String(row[rowKey]).trim() : "";
          };

          return {
            id: crypto.randomUUID(),
            name: getValue(["Họ và tên", "Họ tên", "Ho ten", "Name", "Full Name"]),
            code: getValue(["Tên quy ước", "Mã NV", "Ma NV", "Code", "Staff Code"]),
            department: getValue(["Khoa/Phòng", "Khoa", "Department"]) || "Điều dưỡng",
            phone: getValue(["Số điện thoại", "SĐT", "Phone", "Telephone"]),
            email: getValue(["Email"]),
            targetShifts: parseInt(getValue(["Số buổi trực", "Target Shifts"])) || undefined,
            notes: getValue(["Ghi chú", "Notes"]),
            role: "NURSE" as const,
          };
        }).filter(s => s.name && s.code);

        if (importedStaff.length === 0) {
          toast.error("Không tìm thấy nhân viên hợp lệ trong file (yêu cầu Họ tên và Mã NV)");
          return;
        }

        onImportStaff(importedStaff);
        toast.success(`Đã nhập ${importedStaff.length} nhân viên từ file Excel`);
        // Reset input
        e.target.value = "";
      } catch (error) {
        console.error("Excel import error:", error);
        toast.error("Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = [
      { 
        "Họ và tên": "Nguyễn Văn A", 
        "Tên quy ước": "A (Hồi sức)", 
        "Khoa/Phòng": "Hồi sức", 
        "Số điện thoại": "0901234567", 
        "Email": "a@gmail.com",
        "Số buổi trực": 8,
        "Ghi chú": "Chỉ trực cuối tuần"
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "mau_danh_sach_nhan_vien.xlsx");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên hoặc mã nhân viên..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" onClick={downloadTemplate} className="flex-1 md:flex-none dark:border-slate-700 dark:hover:bg-slate-800">
            Tải mẫu Excel
          </Button>
          <div className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full dark:border-slate-700 dark:hover:bg-slate-800" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-4 w-4 mr-2" />
              Nhập Excel
            </Button>
            <input 
              ref={fileInputRef}
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls" 
              onChange={handleFileUpload} 
            />
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingStaff(null);
              setFormData({});
            }
          }}>
            <DialogTrigger render={<Button className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700" />}>
                <UserPlus className="h-4 w-4 mr-2" />
                Thêm nhân viên
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingStaff ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">Họ và tên</label>
                  <Input
                    className="col-span-3"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">Tên quy ước</label>
                  <Input
                    className="col-span-3"
                    value={formData.code || ""}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">Khoa/Phòng</label>
                  <Input
                    className="col-span-3"
                    value={formData.department || ""}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">SĐT</label>
                  <Input
                    className="col-span-3"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">Số buổi trực/tháng</label>
                  <Input
                    type="number"
                    className="col-span-3"
                    value={formData.targetShifts || ""}
                    onChange={(e) => setFormData({ ...formData, targetShifts: parseInt(e.target.value) || undefined })}
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <label className="text-right text-sm font-medium pt-2">Ngày không trực</label>
                  <div className="col-span-3 flex flex-wrap gap-3 pt-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`day-${day.id}`} 
                          checked={formData.unavailableDays?.includes(day.id) || false}
                          onCheckedChange={(checked) => {
                            const current = formData.unavailableDays || [];
                            if (checked) {
                              setFormData({ ...formData, unavailableDays: [...current, day.id] });
                            } else {
                              setFormData({ ...formData, unavailableDays: current.filter(d => d !== day.id) });
                            }
                          }}
                        />
                        <label htmlFor={`day-${day.id}`} className="text-xs cursor-pointer">{day.label}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-sm font-medium">Ghi chú</label>
                  <Input
                    className="col-span-3"
                    placeholder="Ví dụ: Chỉ trực T7, CN..."
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleSave}>Lưu</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-xl border dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow>
              <TableHead className="w-[60px] text-center dark:text-slate-300">STT</TableHead>
              <TableHead className="dark:text-slate-300">Họ và tên</TableHead>
              <TableHead className="dark:text-slate-300">Tên quy ước</TableHead>
              <TableHead className="dark:text-slate-300">Khoa/Phòng</TableHead>
              <TableHead className="dark:text-slate-300">Ghi chú/Lịch</TableHead>
              <TableHead className="text-right dark:text-slate-300">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length > 0 ? (
              filteredStaff.map((s, index) => (
                <TableRow key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <TableCell className="text-center text-slate-500 dark:text-slate-400 font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-900 dark:text-slate-200">{s.name}</TableCell>
                  <TableCell className="text-blue-600 dark:text-blue-400 font-medium">{s.code}</TableCell>
                  <TableCell className="dark:text-slate-300">{s.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {s.targetShifts && (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded w-fit">
                          Mục tiêu: {s.targetShifts} buổi
                        </span>
                      )}
                      {s.unavailableDays && s.unavailableDays.length > 0 && (
                        <span className="text-[10px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded w-fit">
                          Nghỉ: {s.unavailableDays.map(d => DAYS_OF_WEEK.find(day => day.id === d)?.label).join(", ")}
                        </span>
                      )}
                      {s.notes && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 italic">
                          <Info className="h-3 w-3" />
                          {s.notes}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteStaff(s.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Không tìm thấy nhân viên nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
