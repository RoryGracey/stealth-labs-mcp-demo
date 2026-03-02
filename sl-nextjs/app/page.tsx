'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoaderIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [classificationMax, setClassificationMax] = useState<'UNCLASSIFIED' | 'RESTRICTED' | 'SECRET'>('SECRET');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollTo({
      top: messagesEndRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);
  async function send() {
    const next = [...messages, { role: 'user' as const, content: input }];
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
      const chunk = decoder.decode(value);
      assistant += chunk;

      setMessages(() => [...next, { role: 'assistant' as const, content: assistant }]);
    }

    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 800, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1 className="scroll-m-20 text-center text-4xl mb-2 font-extrabold tracking-tight text-balance">
        Stealth Labs MCP Defence Knowledge Base Chat
      </h1>
      <Card>
        <CardContent>
      <Label className='mb-2'>
        Max classification:{' '}
        </Label>
        <Select value={classificationMax} onValueChange={(value) => setClassificationMax(value as 'UNCLASSIFIED' | 'RESTRICTED' | 'SECRET')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNCLASSIFIED">UNCLASSIFIED</SelectItem>
            <SelectItem value="RESTRICTED">RESTRICTED</SelectItem>
            <SelectItem value="SECRET">SECRET</SelectItem>
          </SelectContent>
        </Select>

        <div
          ref={messagesEndRef}
          style={{
            marginTop: 20,
            padding: 12,
            border: '1px solid #ddd',
            borderRadius: 8,
            height: 360,              // fixed chat window height
            overflowY: 'auto',        // enable vertical scrolling
            background: '#fafafa',
          }}
        >        
        {messages.map((m, i) => (
          <div key={i} style={{ margin: '8px 0' }}>
            <strong>{m.role}:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
          </div>
        ))}
        {loading && <LoaderIcon className="h-6 w-6 animate-spin text-blue-600" />
}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Input
          value={input}
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about UAV jamming, policy, capability gaps…"
          onKeyDown={e => {
            if (e.key === 'Enter') send();
          }}
        />
        <Button onClick={send} disabled={!input.trim() || loading} style={{ padding: '10px 14px' }}>
          Send
        </Button>
      </div>
      </CardContent>
      </Card>
    </main>
  );
}