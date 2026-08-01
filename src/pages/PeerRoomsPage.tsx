import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Users, Circle, ArrowLeft, MessageSquareHeart, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PEER_ROOM_BOTS, generateBotReply } from '@/lib/mockData';

interface RoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
  color: string;
  content: string;
  timestamp: number;
}

export function PeerRoomsPage() {
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [input, setInput] = useState('');
  const [onlineCount] = useState(4);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<string[]>([]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleJoin = () => {
    setJoined(true);
    const intro: RoomMessage = {
      id: 'join',
      senderId: 'system',
      senderName: 'System',
      avatar: 'S',
      color: 'bg-slate-400',
      content: 'You joined Study Room #42. Say hi to your study buddies!',
      timestamp: Date.now(),
    };
    setMessages([intro]);
    setTimeout(() => {
      pushBot('Aarya', 'Hey! Welcome to the room. What are we studying today?');
    }, 1200);
  };

  const pushBot = (name: string, content: string) => {
    const bot = PEER_ROOM_BOTS.find((b) => b.name === name);
    if (!bot) return;
    setMessages((m) => [
      ...m,
      { id: `b-${Date.now()}-${Math.random()}`, senderId: bot.id, senderName: bot.name, avatar: bot.avatar, color: bot.color, content, timestamp: Date.now() },
    ]);
  };

  const handleSend = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [
      ...m,
      { id: `u-${Date.now()}`, senderId: 'me', senderName: 'You', avatar: 'Y', color: 'bg-indigo-600', content: text, timestamp: Date.now() },
    ]);
    setInput('');
    historyRef.current.push(text);

    const delay = 900 + Math.random() * 900;
    setTimeout(() => {
      const bot = PEER_ROOM_BOTS[Math.floor(Math.random() * PEER_ROOM_BOTS.length)];
      const reply = generateBotReply(text, historyRef.current);
      setMessages((m) => [
        ...m,
        { id: `b-${Date.now()}-${Math.random()}`, senderId: bot.id, senderName: bot.name, avatar: bot.avatar, color: bot.color, content: reply, timestamp: Date.now() },
      ]);
    }, delay);
  };

  if (!joined) {
    return (
      <AppShell
        title="Peer Study Rooms"
        subtitle="Join a room to chat with study buddies and clear doubts together."
      >
        <div className="mx-auto max-w-lg">
          <Card className="overflow-hidden border-slate-200 p-8 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-600">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Study with peers</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Join a random study room and start discussing. Clear your doubts with friends —
              this demo includes 3 study buddies ready to chat.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Circle className="h-2.5 w-2.5 fill-emerald-500 text-emerald-500" />
              {onlineCount} students online now
            </div>
            <Button onClick={handleJoin} className="mt-6 w-full bg-fuchsia-600 text-base hover:bg-fuchsia-700">
              <Users className="mr-2 h-5 w-5" />
              Join Random Room
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Study Room #42"
      subtitle="Chat with your study buddies and clear doubts together."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="flex h-[calc(100vh-280px)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-600">
                <MessageSquareHeart className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Study Room #42</p>
                <p className="flex items-center gap-1 text-xs text-emerald-600">
                  <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                  {onlineCount} online
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setJoined(false)} className="text-slate-500">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Leave
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4" ref={scrollRef as never}>
            <div className="space-y-3 py-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex gap-2.5', msg.senderId === 'me' ? 'flex-row-reverse' : 'flex-row')}
                >
                  <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', msg.color)}>
                    {msg.avatar}
                  </div>
                  <div className={cn('max-w-[78%]', msg.senderId === 'me' ? 'items-end' : 'items-start')}>
                    {msg.senderId !== 'system' && msg.senderId !== 'me' && (
                      <p className="mb-0.5 px-1 text-xs font-medium text-slate-500">{msg.senderName}</p>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                        msg.senderId === 'me'
                          ? 'rounded-tr-sm bg-indigo-600 text-white'
                          : msg.senderId === 'system'
                            ? 'mx-auto bg-slate-100 text-center text-xs text-slate-500'
                            : 'rounded-tl-sm bg-slate-100 text-slate-800',
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSend} className="border-t border-slate-100 p-3">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim()} className="bg-fuchsia-600 hover:bg-fuchsia-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Members</h3>
            <ul className="mt-3 space-y-2.5">
              <li className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">Y</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">You</p>
                  <p className="text-xs text-emerald-600">Online</p>
                </div>
              </li>
              {PEER_ROOM_BOTS.map((b) => (
                <li key={b.id} className="flex items-center gap-2.5">
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white', b.color)}>
                    {b.avatar}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">{b.name}</p>
                    <p className="text-xs text-emerald-600">Online</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4">
            <div className="flex items-center gap-2 text-fuchsia-700">
              <Sparkles className="h-4 w-4" />
              <p className="text-xs font-medium">Demo room</p>
            </div>
            <p className="mt-1.5 text-xs text-fuchsia-600/80">
              Study buddies are simulated. They will respond to your messages about physics, chemistry, and maths topics.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
