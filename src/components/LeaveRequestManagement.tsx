/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LeaveRequest, Staff } from "@/src/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface LeaveRequestManagementProps {
  requests: LeaveRequest[];
  staff: Staff[];
  currentUser: Staff | null;
  onAddRequest: (request: LeaveRequest) => void;
  onUpdateStatus: (id: string, status: LeaveRequest["status"]) => void;
}

export default function LeaveRequestManagement({
  requests,
  staff,
  currentUser,
  onAddRequest,
  onUpdateStatus,
}: LeaveRequestManagementProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const isAdmin = currentUser?.role === "ADMIN";
  const filteredRequests = isAdmin 
    ? requests 
    : requests.filter(r => r.staffId === currentUser?.id);

  const handleSave = () => {
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    onAddRequest({
      id: crypto.randomUUID(),
      staffId: currentUser?.id || "",
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    });

    toast.success("Đã gửi yêu cầu nghỉ phép");
    setIsDialogOpen(false);
    setFormData({
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    });
  };

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || "N/A";

  const getStatusBadge = (status: LeaveRequest["status"]) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">Chờ duyệt</Badge>;
      case "APPROVED": return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Đã duyệt</Badge>;
      case "REJECTED": return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Từ chối</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Yêu cầu nghỉ phép</h2>
        {!isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="bg-emerald-600 hover:bg-emerald-700" />}>
                <Plus className="h-4 w-4 mr-2" />
                Đăng ký nghỉ
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Đăng ký nghỉ phép cá nhân</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Từ ngày</label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Đến ngày</label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lý do</label>
                  <Textarea
                    placeholder="Nhập lý do nghỉ..."
                    value={formData.reason || ""}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Gửi yêu cầu</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
            <TableRow className="dark:border-slate-800">
              {isAdmin && <TableHead className="dark:text-slate-300">Nhân viên</TableHead>}
              <TableHead className="dark:text-slate-300">Thời gian</TableHead>
              <TableHead className="dark:text-slate-300">Lý do</TableHead>
              <TableHead className="dark:text-slate-300">Trạng thái</TableHead>
              {isAdmin && <TableHead className="text-right dark:text-slate-300">Thao tác</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => (
              <TableRow key={r.id} className="dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                {isAdmin && <TableCell className="font-medium dark:text-slate-200">{getStaffName(r.staffId)}</TableCell>}
                <TableCell className="text-sm dark:text-slate-300">
                  {format(parseISO(r.startDate), "dd/MM/yyyy")} - {format(parseISO(r.endDate), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm max-w-[200px] truncate dark:text-slate-400">{r.reason}</TableCell>
                <TableCell>{getStatusBadge(r.status)}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    {r.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                          onClick={() => onUpdateStatus(r.id, "APPROVED")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Duyệt
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          onClick={() => onUpdateStatus(r.id, "REJECTED")}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Từ chối
                        </Button>
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 5 : 3} className="h-24 text-center text-muted-foreground">
                  Chưa có yêu cầu nghỉ phép nào.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
