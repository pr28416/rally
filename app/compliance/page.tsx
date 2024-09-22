"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AlignHorizontalJustifyStart, Plus, Send } from "lucide-react";
import Navbar from "@/components/nav/Navbar";
import { DataTableWithHighlight } from "@/app/components/chat-data-table"
import billsData from "@/lib/json/bills.json";
import { MessageSquare, Lightbulb, FileText, Scale, Trash2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseCost, setResponseCost] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatName, setChatName] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleHighlightEnter = (text: string) => {
    const newMessage: Message = {
      role: 'user',
      content: `Explain the following highlighted text from the AI political advertising legislation data: "${text}". 
      Please provide context, interpret its meaning, and discuss its potential implications for political campaigns using AI.`
    }
    handleSubmit(null, newMessage.content)
  }

  const handleSubmit = async (e: React.FormEvent | null, customInput?: string) => {
    if (e) e.preventDefault()
    const inputToSend = customInput || input
    if (!inputToSend.trim()) return

    const newMessage: Message = { role: 'user', content: inputToSend }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setIsLoading(true)

    const startTime = Date.now();

    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: inputToSend }),
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        const chunk = decoder.decode(value);
        assistantMessage += chunk;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: assistantMessage },
        ]);
      }

      const endTime = Date.now();
      setResponseTime(endTime - startTime);
      setResponseCost(((endTime - startTime) / 1000) * 0.0001);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred while processing your request.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateChatName = (messages: Message[]) => {
    if (messages.length > 0) {
      const firstMessage = messages[0];
      const newName = firstMessage.content.split(' ').slice(0, 3).join(' ') + '...';
      setChatName(newName);
    } else {
      setChatName("New Chat");
    }
  };

  const clearChat = () => {
    setMessages([]);
    setChatName("New Chat");
  };

  useEffect(() => {
    updateChatName(messages);
  }, [messages]);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <AlignHorizontalJustifyStart className="w-16 h-16 mb-6 text-blue-500" />
      <h2 className="text-2xl font-bold mb-4">Hey! Welcome to Rally&apos;s Compliance Assistant</h2>
      <p className="text-gray-600 mb-8">
        Start a conversation about AI political ads compliance or try one of these suggestions:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {[
          {
            icon: Lightbulb,
            text: "Explain the current state of AI political advertising legislation in California.",
          },
          {
            icon: FileText,
            text: "What are the key differences in AI political ad regulations between states?",
          },
          {
            icon: MessageSquare,
            text: "How might AI political advertising laws impact campaign strategies?",
          },
          {
            icon: Scale,
            text: "Summarize the most common themes in state AI political ad bills.",
          },
        ].map((item, index) => (
          <button
            key={index}
            className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => handleSubmit(null, item.text)}
          >
            <item.icon className="w-6 h-6 mr-3 text-blue-500" />
            <span className="text-sm text-left">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const FormattedMessage = ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        components={{
          h1: ({ ...props }) => <h1 className="text-2xl font-bold my-4" {...props} />,
          h2: ({ ...props }) => <h2 className="text-xl font-semibold my-3" {...props} />,
          h3: ({ ...props }) => <h3 className="text-lg font-medium my-2" {...props} />,
          p: ({ ...props }) => <p className="my-2" {...props} />,
          ul: ({ ...props }) => <ul className="list-disc list-inside my-2" {...props} />,
          ol: ({ ...props }) => <ol className="list-decimal list-inside my-2" {...props} />,
          li: ({ ...props }) => <li className="ml-4" {...props} />,
          strong: ({ ...props }) => <strong className="font-semibold" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <Navbar>
      <main className="flex flex-row h-[95%] mx-auto bg-white rounded-md">
        <div className="w-1/2 flex flex-col">
          <div className="p-4 pb-5 border-b flex items-center">
            <h2 className="text-lg font-semibold">US States Bills on AI Political Ads</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <DataTableWithHighlight
              columns={[
                { accessorKey: 'name', header: 'State' },
                { accessorKey: 'status', header: 'Status' },
                { accessorKey: 'analysis', header: 'Bills on AI Political Advertisements' }
              ]}
              data={billsData.states}
              onHighlightEnter={handleHighlightEnter}
            />
          </div>
        </div>
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold truncate max-w-[200px]">{chatName}</h2>
            </div>
            <div className="flex items-center space-x-2 p-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* Add rename functionality */}}
                className="text-gray-600 hover:text-gray-800"
              >
                <FileText className="h-4 w-4 mr-1" />
                Rename
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            { messages.length === 0 ? (
              <EmptyState />
            ) : ( 
              messages.map((message, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>{message.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                  </Avatar>
                  <Card className="max-w-[80%]">
                    <CardContent className="p-3">
                      {message.role === 'assistant' && message.content === '' ? (
                        <span className="animate-pulse">▋</span>
                      ) : (
                        <FormattedMessage content={message.content} />
                      )}
                    </CardContent>
                  </Card>
                </div>
              )))}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="border-t p-4">
            <form onSubmit={(e) => handleSubmit(e)} className="flex items-center space-x-2">
              <Button size="icon" variant="outline" type="button">
                <Plus className="h-4 w-4" />
              </Button>
              <Input
                className="flex-1"
                placeholder="Send a message."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <Button size="icon" variant="outline" type="submit" disabled={isLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {responseTime && responseCost && (
              <p className="text-xs text-center mt-2 text-gray-500">
                Response time: {responseTime}ms | Estimated cost: ${responseCost.toFixed(6)}
              </p>
            )}
            <p className="text-xs text-center mt-2 text-gray-500 font-semibold">
              Open source AI chatbot built with Llama 3.1 70B, TuneStudio with Groq, and Vercel AI SDK.
            </p>
          </div>
        </div>
      </main>
    </Navbar>
  );
}