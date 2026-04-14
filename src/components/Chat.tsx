/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Staff, Message } from "@/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, User, Users, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatProps {
  currentUser: Staff;
  staff: Staff[];
  messages: Message[];
  onSendMessage: (message: Message) => void;
}

export default function Chat({ currentUser, staff, messages = [], onSendMessage }: ChatProps) {
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSendMessage({
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: "ALL", // Group chat for now
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setContent("");
  };

  return (
    <div className="h-[calc(100vh-250px)] flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Trò chuyện nội bộ</h2>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md">
          <CardHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-bold">Phòng chung</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        isMe ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {!isMe && <span className="text-[10px] font-bold text-slate-500">{msg.senderName}</span>}
                        <span className="text-[9px] text-slate-400">
                          {format(parseISO(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "px-3 py-2 rounded-2xl text-sm shadow-sm",
                          isMe
                            ? "bg-blue-600 text-white rounded-tr-none"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
                {messages.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm italic">
                    Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSend} className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 flex gap-2">
              <Input
                placeholder="Nhập tin nhắn..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900"
              />
              <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="w-64 hidden lg:flex flex-col overflow-hidden border-none shadow-md">
          <CardHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900/50">
            <CardTitle className="text-sm font-bold">Thành viên ({staff.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto">
              <div className="p-2 space-y-1">
                {staff.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors",
                      s.id === currentUser.id ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      s.status === "ACTIVE" ? "bg-green-500" : "bg-slate-300"
                    )} />
                    <span className="font-medium truncate flex-1">{s.name}</span>
                    {s.role === "ADMIN" && (
                      <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded">Admin</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
