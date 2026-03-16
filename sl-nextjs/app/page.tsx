'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoaderIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

type Classification = 'UNCLASSIFIED' | 'RESTRICTED' | 'SECRET';

type Entry = {
  id: string;
  title: string;
  category: string;
  classification: Classification;
  region: string[];
  tags: string[];
  owner: string;
  lastUpdated: string;
};

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [classificationMax, setClassificationMax] =
    useState<Classification>('SECRET');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const query_entries = async () => {
    try {
      setEntriesLoading(true);

      const res = await fetch(
        `/api/entries?classificationMax=${classificationMax}`
      );
      const data = await res.json();

      console.log('entries', data.entries);
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch (err) {
      console.error('failed to load entries', err);
      setEntries([]);
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    const el = chatScrollRef.current;
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

    try {
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
        assistant += decoder.decode(value, { stream: true });

        setMessages([...next, { role: 'assistant' as const, content: assistant }]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 font-sans">
      <h1 className="mb-6 text-center text-4xl font-extrabold tracking-tight text-blue-600">
        Stealth Labs MCP Defence Knowledge Base
      </h1>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label>Max classification</Label>
          <Select
            value={classificationMax}
            onValueChange={v => setClassificationMax(v as Classification)}
          >
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
                ref={chatScrollRef}
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

            <CardContent>
              <div className="flex flex-col gap-4">
                <Button onClick={query_entries} disabled={entriesLoading}>
                  {entriesLoading
                    ? 'Loading entries...'
                    : `Get Entries for classification ${classificationMax}`}
                </Button>

                <div
                  ref={listScrollRef}
                  className="h-[380px] overflow-y-auto rounded-lg border bg-muted/30 p-3"
                >
                  {entriesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LoaderIcon className="h-4 w-4 animate-spin text-blue-600" />
                      Loading entries…
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No entries loaded. Click the button above.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {entries.map(entry => (
                        <div
                          key={entry.id}
                          className="rounded-lg border bg-white p-4 shadow-sm"
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-foreground">
                                {entry.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entry.id}
                              </div>
                            </div>

                            <div
                              className={`rounded px-2 py-0.5 text-xs font-medium ${
                                entry.classification === 'SECRET'
                                  ? 'bg-red-100 text-red-700'
                                  : entry.classification === 'RESTRICTED'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {entry.classification}
                            </div>
                          </div>

                          <div className="grid gap-2 text-sm text-foreground">
                            <div>
                              <span className="font-medium">Category:</span>{' '}
                              {entry.category}
                            </div>

                            <div>
                              <span className="font-medium">Owner:</span>{' '}
                              {entry.owner}
                            </div>

                            <div>
                              <span className="font-medium">Region:</span>{' '}
                              {entry.region.join(', ')}
                            </div>

                            <div>
                              <span className="font-medium">Tags:</span>{' '}
                              {entry.tags.join(', ')}
                            </div>

                            <div>
                              <span className="font-medium">Last updated:</span>{' '}
                              {new Date(entry.lastUpdated).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}