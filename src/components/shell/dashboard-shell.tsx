"use client";

import { useState, createContext, useContext } from "react";

interface ChatContextType {
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
}

export const ChatContext = createContext<ChatContextType>({
  chatOpen: false,
  setChatOpen: () => {},
});

export function useChatContext() {
  return useContext(ChatContext);
}

/** Shell that lets the chat panel push the main content aside on large screens. */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <ChatContext.Provider value={{ chatOpen, setChatOpen }}>
      <div
        className={`transition-all duration-300 ${chatOpen ? "lg:mr-[420px]" : ""}`}
      >
        {children}
      </div>
    </ChatContext.Provider>
  );
}
