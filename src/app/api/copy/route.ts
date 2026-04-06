import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, sourceId, targetId, options } = await req.json()
    
    if (!token || !sourceId || !targetId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const stats = { roles: 0, txt: 0, voice: 0, cats: 0, emojis: 0 }
    const roleMap: Record<string, string> = {}
    const catMap: Record<string, string> = {}
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    // Fast parallel API
    const apiParallel = async (requests: Array<{method: string, endpoint: string, body?: object}>) => {
      return Promise.all(requests.map(async req => {
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
          if (res.status === 429) {
            const data = await res.json().catch(() => ({}))
            await sleep(((data as any).retry_after || 0.5) * 1000)
            // Retry
            const retryRes = await fetch(`https://discord.com/api/v10/${req.endpoint}`, {
              method: req.method,
              headers: { 
                'Authorization': token, 
                'Content-Type': 'application/json' 
              },
              body: req.body ? JSON.stringify(req.body) : undefined
            })
            return retryRes.status === 204 ? {} : retryRes.json().catch(() => ({}))
          }
          return res.json().catch(() => ({}))
        } catch { return {} }
      }))
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
          await sleep(((data as any).retry_after || 0.5) * 1000)
          return api(method, endpoint, body)
        }
        return res.json().catch(() => ({}))
      } catch { return {} }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔥 STEP 1: Fetch source guild data (فقط جلب البيانات - لا يحتاج أدمن)
    // ═══════════════════════════════════════════════════════════════
    
    const [roles, channels, emojis, guildInfo] = await Promise.all([
      api('GET', `guilds/${sourceId}/roles`),
      api('GET', `guilds/${sourceId}/channels`),
      api('GET', `guilds/${sourceId}/emojis`),
      api('GET', `guilds/${sourceId}`)
    ])

    if (!Array.isArray(roles)) {
      return NextResponse.json({ error: 'فشل جلب الرتب - تأكد من أيدي السيرفر المصدر' }, { status: 400 })
    }
    if (!Array.isArray(channels)) {
      return NextResponse.json({ error: 'فشل جلب الرومات - تأكد من أيدي السيرفر المصدر' }, { status: 400 })
    }

    // Get target guild's @everyone role
    const targetRoles = await api('GET', `guilds/${targetId}/roles`)
    const targetEveryone = Array.isArray(targetRoles) 
      ? targetRoles.find((r: any) => r.name === '@everyone') 
      : null

    // ═══════════════════════════════════════════════════════════════
    // 🔥 STEP 2: Copy Server Settings
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.settings && guildInfo && !(guildInfo as any).message) {
      const g = guildInfo as any
      await api('PATCH', `guilds/${targetId}`, {
        name: g.name,
        description: g.description,
        verification_level: g.verification_level,
        default_message_notifications: g.default_message_notifications,
        explicit_content_filter: g.explicit_content_filter,
        afk_timeout: g.afk_timeout,
        system_channel_flags: g.system_channel_flags
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔥 STEP 3: Copy Roles (بالترتيب الصحيح - من الأدنى للأعلى)
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.roles) {
      const srcEveryone = roles.find((r: any) => r.name === '@everyone')
      
      // Update @everyone permissions
      if (srcEveryone && targetEveryone) {
        await api('PATCH', `guilds/${targetId}/roles/${targetEveryone.id}`, { 
          permissions: srcEveryone.permissions,
          mentionable: srcEveryone.mentionable
        })
      }

      // Sort roles by position (LOWEST FIRST - important for Discord!)
      const toCreate = roles
        .filter((r: any) => r.name !== '@everyone' && !r.managed)
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

      // Create roles one by one (Discord requires this for proper position)
      for (const r of toCreate) {
        const newRole = await api('POST', `guilds/${targetId}/roles`, { 
          name: r.name, 
          color: r.color, 
          hoist: r.hoist, 
          mentionable: r.mentionable, 
          permissions: r.permissions,
          icon: r.icon,
          unicode_emoji: r.unicode_emoji
        })
        
        if ((newRole as any).id) {
          roleMap[r.id] = (newRole as any).id
          stats.roles++
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔥 STEP 4: Copy Categories (بالترتيب الصحيح)
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.channels) {
      // Categories first (sorted by position)
      const categories = channels
        .filter((c: any) => c.type === 4)
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

      // Create categories in parallel (batches of 5)
      const batchSize = 5
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize)
        const results = await apiParallel(batch.map(c => ({
          method: 'POST',
          endpoint: `guilds/${targetId}/channels`,
          body: { 
            name: (c as any).name, 
            type: 4,
            position: (c as any).position,
            permission_overwrites: (c as any).permission_overwrites?.map((p: any) => ({
              id: roleMap[p.id] || p.id,
              allow: p.allow,
              deny: p.deny,
              type: p.type
            }))
          }
        })))
        
        results.forEach((res, idx) => {
          if ((res as any).id) {
            catMap[categories[idx].id] = (res as any).id
            stats.cats++
          }
        })
        await sleep(50)
      }

      // ═══════════════════════════════════════════════════════════════
      // 🔥 STEP 5: Copy Channels (بالترتيب الصحيح + مع التصنيفات)
      // ═══════════════════════════════════════════════════════════════
      
      const chs = channels
        .filter((c: any) => c.type !== 4)
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

      // Create channels in parallel (batches of 3)
      const channelBatchSize = 3
      for (let i = 0; i < chs.length; i += channelBatchSize) {
        const batch = chs.slice(i, i + channelBatchSize)
        const results = await apiParallel(batch.map(c => {
          const payload: any = { 
            name: (c as any).name, 
            type: (c as any).type, 
            nsfw: (c as any).nsfw || false,
            position: (c as any).position,
            permission_overwrites: (c as any).permission_overwrites?.map((p: any) => ({
              id: roleMap[p.id] || p.id,
              allow: p.allow,
              deny: p.deny,
              type: p.type
            }))
          }
          
          // Parent category
          if ((c as any).parent_id && catMap[(c as any).parent_id]) {
            payload.parent_id = catMap[(c as any).parent_id]
          }
          
          // Text channel specific
          if ((c as any).type === 0) {
            if ((c as any).topic) payload.topic = (c as any).topic
            if ((c as any).rate_limit_per_user) payload.rate_limit_per_user = (c as any).rate_limit_per_user
            if ((c as any).default_auto_archive_duration) payload.default_auto_archive_duration = (c as any).default_auto_archive_duration
          }
          
          // Voice channel specific
          if ((c as any).type === 2) {
            payload.bitrate = (c as any).bitrate || 64000
            payload.user_limit = (c as any).user_limit || 0
            if ((c as any).rtc_region) payload.rtc_region = (c as any).rtc_region
          }
          
          // Stage channel
          if ((c as any).type === 13) {
            payload.topic = (c as any).topic
          }
          
          // Announcement channel
          if ((c as any).type === 5) {
            if ((c as any).topic) payload.topic = (c as any).topic
          }
          
          return {
            method: 'POST',
            endpoint: `guilds/${targetId}/channels`,
            body: payload
          }
        }))
        
        results.forEach((res, idx) => {
          const c = batch[idx]
          if ((res as any).id || (res as any).success) {
            if ((c as any).type === 0 || (c as any).type === 5) stats.txt++
            else if ((c as any).type === 2 || (c as any).type === 13) stats.voice++
          }
        })
        await sleep(50)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔥 STEP 6: Copy Emojis (إذا كان متاح)
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.emojis && Array.isArray(emojis) && emojis.length > 0) {
      const emojiBatchSize = 2
      for (let i = 0; i < emojis.length; i += emojiBatchSize) {
        const batch = emojis.slice(i, i + emojiBatchSize)
        const results = await apiParallel(batch.map(e => ({
          method: 'POST',
          endpoint: `guilds/${targetId}/emojis`,
          body: {
            name: (e as any).name,
            image: (e as any).image || `https://cdn.discordapp.com/emojis/${(e as any).id}.${(e as any).animated ? 'gif' : 'png'}`,
            roles: (e as any).roles?.map((rId: string) => roleMap[rId]).filter(Boolean)
          }
        })))
        
        results.forEach(res => {
          if ((res as any).id) stats.emojis++
        })
        await sleep(100)
      }
    }

    return NextResponse.json({ 
      success: true, 
      stats,
      message: 'تم النسخ بنجاح!'
    })
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
