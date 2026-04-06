import { NextRequest, NextResponse } from 'next/server'
import { WEBHOOK_URL, BOT_INFO } from '@/lib/config'

export async function POST(req: NextRequest) {
  try {
    const { action, details } = await req.json()
    
    if (!WEBHOOK_URL || WEBHOOK_URL.includes('XXXXXXXXX')) {
      // No webhook configured, skip silently
      return NextResponse.json({ success: true, skipped: true })
    }

    const fields = Object.entries(details || {}).map(([name, value]) => ({
      name,
      value: String(value),
      inline: true
    }))

    const payload = {
      username: BOT_INFO.name,
      avatar_url: BOT_INFO.avatar,
      embeds: [{
        title: '⚡ ' + action,
        color: 0xFF0000,
        fields: fields.length > 0 ? fields : undefined,
        timestamp: new Date().toISOString(),
        footer: { text: BOT_INFO.footer }
      }]
    }

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: 'Webhook failed' })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Error' })
  }
}
