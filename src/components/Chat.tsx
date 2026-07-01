/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Staff, Message } from "@/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, User, Users, MessageSquare, Search, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { vi } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface ChatProps {
  currentUser: Staff;
  staff: Staff[];
  messages: Message[];
  onSendMessage: (message: Message) => void;
  onDeleteMessage: (id: string) => void;
  activeRecipientId?: string;
  onActiveRecipientIdChange?: (id: string) => void;
}

export default function Chat({ 
  currentUser, 
  staff, 
  messages = [], 
  onSendMessage, 
  onDeleteMessage,
  activeRecipientId,
  onActiveRecipientIdChange
}: ChatProps) {
  const [content, setContent] = useState("");
  const [localRecipientId, setLocalRecipientId] = useState<string>("ALL");
  const selectedRecipientId = activeRecipientId !== undefined ? activeRecipientId : localRecipientId;
  const setSelectedRecipientId = (id: string) => {
    if (onActiveRecipientIdChange) {
      onActiveRecipientIdChange(id);
    } else {
      setLocalRecipientId(id);
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
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
        <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-md dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedRecipientId === "ALL" ? <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" /> : <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
              <CardTitle className="text-sm font-bold dark:text-slate-100">
                {selectedRecipientId === "ALL" ? "Phòng chung" : `Chat với ${selectedRecipient?.name}`}
              </CardTitle>
            </div>
            {selectedRecipientId !== "ALL" && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => setSelectedRecipientId("ALL")}>
                Quay lại phòng chung
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 dark:bg-slate-950/30">
              <div className="space-y-4">
                {filteredMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const canDelete = currentUser.role === "ADMIN" || isMe;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%] group",
                        isMe ? "ml-auto items-end" : "items-start"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {!isMe && selectedRecipientId === "ALL" && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{msg.senderName}</span>}
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          {format(parseISO(msg.createdAt), "HH:mm")}
                        </span>
                      </div>
                      <div className={cn("flex items-center gap-1.5 w-full", isMe ? "flex-row-reverse" : "flex-row")}>
                        <div
                          className={cn(
                            "px-3 py-2 rounded-2xl text-sm shadow-sm break-words max-w-full",
                            isMe
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none"
                          )}
                        >
                          {msg.content}
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => onDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 max-md:opacity-40 transition-opacity p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 pointer-events-auto cursor-pointer"
                            title="Xóa tin nhắn"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollRef} />
                {filteredMessages.length === 0 && (
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-sm italic">
                    Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleSend} className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
              <Input
                placeholder={selectedRecipientId === "ALL" ? "Nhắn vào phòng chung..." : `Nhắn cho ${selectedRecipient?.name}...`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 bg-white dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
              />
              <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="w-64 hidden lg:flex flex-col overflow-hidden border-none shadow-md dark:bg-slate-900 dark:border-slate-800">
          <CardHeader className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <CardTitle className="text-sm font-bold dark:text-slate-100">Thành viên ({staff.filter(s => s.id !== currentUser.id).length})</CardTitle>
          </CardHeader>
          <div className="p-3 border-b dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/20">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Tìm thành viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-950 border dark:border-slate-800 rounded-md focus-visible:ring-1 focus-visible:ring-blue-500 placeholder:text-slate-400"
              />
            </div>
          </div>
          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="h-full overflow-y-auto">
              <div className="p-2 space-y-1">
                <div
                  onClick={() => setSelectedRecipientId("ALL")}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer",
                    selectedRecipientId === "ALL" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  <Users className="h-3 w-3" />
                  <span>Phòng chung</span>
                </div>
                
                <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
                
                {staff
                  .filter(s => s.id !== currentUser.id)
                  .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedRecipientId(s.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors cursor-pointer",
                      selectedRecipientId === s.id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold" : "hover:bg-slate-50 dark:hover:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      s.status === "ACTIVE" ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
                    )} />
                    <span className="font-medium truncate flex-1">{s.name}</span>
                    {s.role === "ADMIN" && (
                      <span className="text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1 rounded">Admin</span>
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
