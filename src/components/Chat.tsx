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
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("ALL");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, selectedRecipientId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSendMessage({
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: selectedRecipientId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    });
    setContent("");
  };

  const filteredMessages = messages.filter(msg => {
    if (selectedRecipientId === "ALL") {
      return msg.receiverId === "ALL";
    }
    // Private chat: either I am the sender and they are the receiver, or vice versa
    return (msg.senderId === currentUser.id && msg.receiverId === selectedRecipientId) ||
           (msg.senderId === selectedRecipientId && msg.receiverId === currentUser.id);
  });

  const selectedRecipient = staff.find(s => s.id === selectedRecipientId);

  return (
    <div className="h-[calc(100vh-250px)] flex flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Trò chuyện nội bộ</h2>
        </div>
        <div className="text-xs text-slate-500 italic">
          Đang chat: <span className="font-bold text-blue-600">{selectedRecipientId === "ALL" ? "Phòng chung" : selectedRecipient?.name}</span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md">
          <CardHeader className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedRecipientId === "ALL" ? <Users className="h-4 w-4 text-blue-600" /> : <User className="h-4 w-4 text-blue-600" />}
              <CardTitle className="text-sm font-bold">
                {selectedRecipientId === "ALL" ? "Phòng chung" : `Chat với ${selectedRecipient?.name}`}
              </CardTitle>
            </div>
            {selectedRecipientId !== "ALL" && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setSelectedRecipientId("ALL")}>
                Quay lại phòng chung
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {filteredMessages.map((msg) => {
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
                        {!isMe && selectedRecipientId === "ALL" && <span className="text-[10px] font-bold text-slate-500">{msg.senderName}</span>}
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
                {filteredMessages.length === 0 && (
                  <div className="text-center py-10 text-slate-400 text-sm italic">
                    Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSend} className="p-4 border-t bg-slate-50 dark:bg-slate-900/50 flex gap-2">
              <Input
                placeholder={selectedRecipientId === "ALL" ? "Nhắn vào phòng chung..." : `Nhắn cho ${selectedRecipient?.name}...`}
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
                <div
                  onClick={() => setSelectedRecipientId("ALL")}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer",
                    selectedRecipientId === "ALL" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                  )}
                >
                  <Users className="h-3 w-3" />
                  <span>Phòng chung</span>
                </div>
                
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                
                {staff.filter(s => s.id !== currentUser.id).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedRecipientId(s.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer",
                      selectedRecipientId === s.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800"
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
