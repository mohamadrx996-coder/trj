import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, channelId, messages, duration, count, speed } = await req.json()
    
    if (!token || !channelId || !messages?.length) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    let sent = 0
    let failed = 0
    let i = 0
    const messageCount = messages.length
    const delay = (speed || 0.5) * 1000
    
    // Mode: Count or Duration
    const useCount = count && count > 0
    const maxIterations = useCount ? count : Infinity
    const endTime = useCount ? Infinity : Date.now() + ((duration || 60) * 1000)
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    const sendMessage = async (content: string) => {
      try {
        const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
          method: 'POST',
          headers: { 
            'Authorization': token, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ content })
        })
        
        if (res.ok) {
          sent++
          return true
        } else if (res.status === 429) {
          // Rate limited
          const data = await res.json().catch(() => ({}))
          const retryAfter = (data as any).retry_after || 1
          await sleep(retryAfter * 1000)
          return false
        } else {
          failed++
          return false
        }
      } catch {
        failed++
        return false
      }
    }

    if (useCount) {
      // Count mode
      while (i < maxIterations) {
        await sendMessage(messages[i % messageCount])
        i++
        if (i < maxIterations) await sleep(delay)
      }
    } else {
      // Duration mode
      while (Date.now() < endTime) {
        await sendMessage(messages[i % messageCount])
        i++
        if (Date.now() < endTime) await sleep(delay)
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent, 
      failed,
      total: sent + failed 
    })
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
