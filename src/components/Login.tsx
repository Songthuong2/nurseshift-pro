/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Staff } from "@/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Lock, User, ShieldCheck, Info, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface LoginProps {
  staff: Staff[];
  onLogin: (user: Staff) => void;
}

export default function Login({ staff, onLogin }: LoginProps) {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showDemoHelp, setShowDemoHelp] = useState(false);

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
        status: "ACTIVE",
      });
      toast.success("Đăng nhập thành công với quyền Admin");
      return;
    }

    const user = staff.find(s => s.code === code);
    if (user) {
      if (user.status === "LOCKED") {
        toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.");
        return;
      }

      const validPassword = user.password || "123456";
      if (password === validPassword) {
        onLogin(user);
        toast.success(`Chào mừng trở lại, ${user.name}`);
      } else {
        toast.error("Mật khẩu không đúng");
      }
    } else {
      toast.error("Mã nhân viên hoặc mật khẩu không đúng");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/50 via-slate-50 to-teal-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-teal-950/25 p-4 relative overflow-hidden font-sans">
      {/* Decorative medical elements background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-teal-200/15 rounded-full blur-3xl pointer-events-none dark:bg-teal-900/10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/15 rounded-full blur-3xl pointer-events-none dark:bg-blue-900/10" />
      
      <Card className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl border border-slate-100 dark:border-slate-800/80 rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-blue-500/5">
        {/* Top subtle visual strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500" />
        
        <CardHeader className="space-y-1 text-center pt-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-blue-600 to-teal-500 p-3.5 rounded-2xl shadow-lg shadow-blue-500/25 relative group">
              <Stethoscope className="h-8 w-8 text-white animate-heartbeat" />
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            NurseShift <span className="text-blue-600 dark:text-teal-400">Pro</span>
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 font-medium">Hệ thống điều phối & quản lý lịch trực y tế</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Mã nhân viên</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input 
                  placeholder="Nhập mã nhân viên của bạn..." 
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40 rounded-xl focus-visible:ring-primary focus-visible:ring-offset-0"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 leading-none">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="pl-10 h-11 border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40 rounded-xl focus-visible:ring-primary focus-visible:ring-offset-0"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 pb-8 pt-2">
            <Button type="submit" className="w-full h-11 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer hover:scale-[1.01] transition-transform">
              Đăng nhập hệ thống
            </Button>
            
            <div className="w-full border-t border-slate-100 dark:border-slate-800/85 my-2" />

            <div className="flex flex-col items-center gap-2 w-full text-center">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-teal-400 bg-emerald-500/5 dark:bg-emerald-950/20 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                <ShieldCheck className="h-3.5 w-3.5" />
                Kết nối SSL bảo mật thông tin nội bộ y tế
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs leading-normal">
                Vui lòng tự bảo mật thông tin đăng nhập của bạn theo Quy chế An toàn thông tin Bệnh viện và Bộ Y tế.
              </p>
              
              <button
                type="button"
                onClick={() => setShowDemoHelp(!showDemoHelp)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-blue-500 dark:text-teal-400 hover:underline cursor-pointer font-medium focus:outline-none"
              >
                <Info className="h-3 w-3" />
                {showDemoHelp ? "Ẩn hướng dẫn đăng nhập" : "Hướng dẫn đăng nhập cho nhân viên"}
                {showDemoHelp ? <ChevronUp className="h-3 w-3 transition-transform" /> : <ChevronDown className="h-3 w-3 transition-transform" />}
              </button>

              {showDemoHelp && (
                <div className="mt-2 text-[11px] text-left text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 w-full space-y-1.5 shadow-inner transition-all">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">📍 Hướng dẫn đăng nhập cho nhân viên:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><span className="font-medium">Điều dưỡng & Nhân viên y tế:</span> Đăng nhập bằng <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-slate-200">mã nhân viên</code> của bạn được cấp.</li>
                    <li><span className="font-medium">Mật khẩu mặc định:</span> Khởi tạo ban đầu là <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-slate-200">123456</code> (có thể thay đổi mật khẩu sau khi đăng nhập tại tab "Lịch của tôi").</li>
                  </ul>
                </div>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
