// Supabase Edge Function: Generate OG images for social sharing
// Returns an SVG-based image for poll sharing cards

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pollId = url.searchParams.get('poll');

    if (!pollId) {
      return new Response('Missing poll ID', { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: poll } = await supabase
      .from('polls')
      .select('question, total_votes, category, creator:profiles!creator_id(username)')
      .eq('id', pollId)
      .single();

    if (!poll) {
      return new Response('Poll not found', { status: 404 });
    }

    const question = poll.question.length > 80
      ? poll.question.substring(0, 77) + '...'
      : poll.question;

    const creator = (poll.creator as any)?.username || 'anonymous';

    // Generate SVG OG image
    const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#09090b;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#18181b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="4" fill="#3b82f6"/>

  <!-- Logo -->
  <text x="60" y="80" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">
    Crowdcast
  </text>

  <!-- Category badge -->
  ${poll.category ? `
  <rect x="60" y="120" width="${poll.category.length * 12 + 24}" height="32" rx="16" fill="#3b82f6" opacity="0.2"/>
  <text x="72" y="142" font-family="system-ui, sans-serif" font-size="14" fill="#3b82f6">
    ${escapeXml(poll.category)}
  </text>` : ''}

  <!-- Question -->
  <text x="60" y="260" font-family="system-ui, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" width="1080">
    ${wrapText(escapeXml(question), 40).map((line: string, i: number) =>
      `<tspan x="60" dy="${i === 0 ? 0 : 58}">${line}</tspan>`
    ).join('')}
  </text>

  <!-- Stats -->
  <text x="60" y="520" font-family="system-ui, sans-serif" font-size="20" fill="#a1a1aa">
    ${poll.total_votes} votes &middot; by @${escapeXml(creator)}
  </text>

  <!-- CTA -->
  <rect x="60" y="555" width="200" height="44" rx="22" fill="#3b82f6"/>
  <text x="110" y="583" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#ffffff">
    Vote Now
  </text>
</svg>`;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    return new Response(`Error: ${(error as Error).message}`, { status: 500 });
  }
});

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += ' ' + word;
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim());
  return lines.slice(0, 3); // max 3 lines
}
