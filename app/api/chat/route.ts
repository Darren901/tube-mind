import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getVideoTranscript } from '@/lib/youtube/client';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages, videoId } = await req.json();

  if (!videoId) {
    return new Response('Missing videoId', { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });

  if (!video) {
    return new Response('Video not found', { status: 404 });
  }

  let transcript = video.transcript as any;

  // Lazy Fetching: If transcript missing, fetch and save it
  if (!transcript) {
    console.log(`[Chat] Transcript missing for ${videoId}, fetching...`);
    try {
      transcript = await getVideoTranscript(video.youtubeId);
      await prisma.video.update({
        where: { id: videoId },
        data: { transcript: transcript as any },
      });
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      return new Response('Failed to fetch video content', { status: 500 });
    }
  }

  // Format transcript
  const transcriptText = Array.isArray(transcript)
    ? transcript
        .map((t: any) => `[${formatTimestamp(t.timestamp)}] ${t.text}`)
        .join('\n')
    : JSON.stringify(transcript);

  // Truncate if too long (though Flash-Lite has 1M context, safer to limit slightly to avoid timeouts)
  // 1M chars is safe.

  const result = await streamText({
    model: google('gemini-2.0-flash-lite-preview-02-05'),
    system: `You are an AI learning assistant for the video "${video.title}".
    
    Your goal is to help the user understand the video content.
    
    Instructions:
    1. Answer based ONLY on the provided Transcript.
    2. If the answer is not in the transcript, say "影片中沒有提到相關資訊".
    3. Use Traditional Chinese (繁體中文) for all responses.
    4. When answering, try to cite the timestamp (e.g. [05:20]) if possible.
    
    Transcript:
    ${transcriptText}
    `,
    messages,
  });

  return (result as any).toTextStreamResponse();
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
