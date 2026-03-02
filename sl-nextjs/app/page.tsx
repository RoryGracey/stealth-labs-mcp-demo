'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoaderIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [classificationMax, setClassificationMax] = useState<'UNCLASSIFIED' | 'RESTRICTED' | 'SECRET'>('SECRET');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  const query_entries = async () => {
    const res = await fetch(`/api/entries?classificationMax=${classificationMax}`);
    const data = await res.json();
    console.log('entries', data.entries);
    setEntries(data.entries);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setInput('');
    setLoading(true);

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: next.map(m => ({ role: m.role, content: m.content })),
        classificationMax,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let assistant = '';

    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      assistant += decoder.decode(value);

      setMessages(() => [...next, { role: 'assistant' as const, content: assistant }]);
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 font-sans">
      <h1 className="mb-6 text-center text-4xl font-extrabold tracking-tight text-blue-600">
        Stealth Labs MCP Defence Knowledge Base
      </h1>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label>Max classification</Label>
          <Select value={classificationMax} onValueChange={v => setClassificationMax(v as 'UNCLASSIFIED' | 'RESTRICTED' | 'SECRET')}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select classification" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
              <SelectItem value="RESTRICTED">RESTRICTED</SelectItem>
              <SelectItem value="SECRET">SECRET</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="query" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="query">Query</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="query" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div
                ref={scrollRef}
                className="h-[380px] overflow-y-auto rounded-lg border bg-muted/30 p-3"
              >
                {messages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Ask something like “jamming” or “policy”.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m, i) => (
                      <div key={i} className="space-y-1">
                        <div className="text-xs font-semibold text-muted-foreground">
                          {m.role === 'user' ? 'You' : 'Assistant'}
                        </div>
                        <div
                          className={`whitespace-pre-wrap rounded-lg border px-3 py-2 text-sm ${
                            m.role === 'user' ? 'bg-background' : 'bg-white'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {loading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderIcon className="h-4 w-4 animate-spin text-blue-600" />
                    Thinking…
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  value={input}
                  disabled={loading}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about UAV jamming, policy, capability gaps…"
                  onKeyDown={e => {
                    if (e.key === 'Enter') send();
                  }}
                />
                <Button onClick={send} disabled={!input.trim() || loading}>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Knowledge entries</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className='flex flex-col gap-4'>
              <Button onClick={query_entries}>Get Entries for classification {classificationMax}</Button>
              <div
                ref={scrollRef}
                className="h-[380px] overflow-y-auto rounded-lg border bg-muted/30 p-3"
              ></div>
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}