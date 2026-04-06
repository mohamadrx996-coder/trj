import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, channelId, messages, duration, count, speed } = await req.json()
    
    if (!token || !channelId || !messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'بيانات ناقصة أو غير صالحة' }, { status: 400 })
    }

    let sent = 0
    let failed = 0
    let i = 0
    const messageCount = messages.length
    const delay = Math.max(100, (speed || 0.5) * 1000)
    
    // Mode: Count or Duration
    const useCount = count && count > 0
    const maxIterations = useCount ? Math.min(count, 10000) : Infinity
    const endTime = useCount ? Infinity : Date.now() + Math.min((duration || 60), 3600) * 1000
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    const sendMessage = async (content: string): Promise<boolean> => {
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
        }
        
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          const retryAfter = (data as any).retry_after || 1
          await sleep(retryAfter * 1000 + 500)
          return false
        }
        
        if (res.status === 403 || res.status === 401) {
          failed++
          return false
        }
        
        failed++
        return false
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
        if (i < maxIterations) {
          await sleep(delay)
        }
      }
    } else {
      // Duration mode
      while (Date.now() < endTime) {
        await sendMessage(messages[i % messageCount])
        i++
        if (Date.now() < endTime) {
          await sleep(delay)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      sent, 
      failed,
      total: sent + failed 
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'خطأ: ' + (error.message || 'Unknown error') 
    }, { status: 500 })
  }
}
