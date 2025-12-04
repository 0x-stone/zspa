import { ChatPayload, SSEEvent } from '@/lib/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function* streamChatResponse(payload: ChatPayload): AsyncGenerator<SSEEvent, void, unknown> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const response = await fetch(`${API_URL}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('Stream not available');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          return;
        }

        try {
          const parsed = JSON.parse(data);
          yield parsed as SSEEvent;
        } catch (e) {
          console.error('Failed to parse SSE data:', e, data);
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.startsWith('data: ')) {
    const data = buffer.slice(6).trim();
    if (data !== '[DONE]') {
      try {
        const parsed = JSON.parse(data);
        yield parsed as SSEEvent;
      } catch (e) {
        console.error('Failed to parse SSE data:', e);
      }
    }
  }
}

