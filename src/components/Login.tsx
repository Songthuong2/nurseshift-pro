/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Staff } from "@/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Lock, User } from "lucide-react";
import { toast } from "sonner";

interface LoginProps {
  staff: Staff[];
  onLogin: (user: Staff) => void;
}

export default function Login({ staff, onLogin }: LoginProps) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For demo: Admin is code "ADMIN" or any staff with role ADMIN
    // Default admin if no staff exists
    if (code === "ADMIN" && password === "admin") {
      onLogin({
        id: "admin-id",
        name: "Quản trị viên",
        code: "ADMIN",
        department: "Quản lý",
        role: "ADMIN",
      });
      toast.success("Đăng nhập thành công với quyền Admin");
      return;
    }

    const user = staff.find(s => s.code === code);
    if (user) {
      // In a real app, we'd check password. Here we just allow it for demo.
      onLogin(user);
      toast.success(`Chào mừng trở lại, ${user.name}`);
    } else {
      toast.error("Mã nhân viên hoặc mật khẩu không đúng");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <Stethoscope className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">NurseShift Pro</CardTitle>
          <CardDescription>Đăng nhập để quản lý lịch trực của bạn</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Mã nhân viên</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="Nhập mã nhân viên..." 
                  className="pl-10 h-11"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-base font-semibold">
              Đăng nhập
            </Button>
            <div className="text-center text-xs text-slate-500">
              <p>Demo: Admin (ADMIN/admin)</p>
              <p>Hoặc nhập mã nhân viên đã tạo</p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
