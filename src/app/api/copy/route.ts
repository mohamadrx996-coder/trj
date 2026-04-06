import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, sourceId, targetId, options } = await req.json()
    
    if (!token || !sourceId || !targetId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    // ═══════════════════════════════════════════════════════════════
    // 📊 الإحصائيات
    // ═══════════════════════════════════════════════════════════════
    
    const stats = { 
      roles_deleted: 0, 
      roles_created: 0, 
      channels_deleted: 0, 
      channels_created: 0, 
      categories_created: 0,
      emojis: 0 
    }
    
    const roleMap: Record<string, string> = {}
    const catMap: Record<string, string> = {}
    
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
    
    // ═══════════════════════════════════════════════════════════════
    // 🔧 دوال API
    // ═══════════════════════════════════════════════════════════════
    
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
        
        // Rate limit handling
        if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          const retryAfter = (data as any).retry_after || 1
          await sleep(retryAfter * 1000 + 500)
          return api(method, endpoint, body)
        }
        
        if (res.status === 204) return { success: true, status: 204 }
        if (res.status === 201) return res.json().catch(() => ({ success: true }))
        if (res.status === 200) return res.json().catch(() => ({ success: true }))
        
        const data = await res.json().catch(() => ({}))
        return { ...data, _status: res.status }
      } catch (e) {
        return { error: true }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 1️⃣ جلب بيانات السيرفرين
    // ═══════════════════════════════════════════════════════════════
    
    const [sourceRoles, sourceChannels, sourceGuild, targetRoles, targetChannels] = await Promise.all([
      api('GET', `guilds/${sourceId}/roles`),
      api('GET', `guilds/${sourceId}/channels`),
      api('GET', `guilds/${sourceId}`),
      api('GET', `guilds/${targetId}/roles`),
      api('GET', `guilds/${targetId}/channels`)
    ])

    if (!Array.isArray(sourceRoles)) {
      return NextResponse.json({ error: 'فشل جلب رتب المصدر - تأكد من الأيدي' }, { status: 400 })
    }
    if (!Array.isArray(sourceChannels)) {
      return NextResponse.json({ error: 'فشل جلب رومات المصدر - تأكد من الأيدي' }, { status: 400 })
    }
    if (!Array.isArray(targetRoles)) {
      return NextResponse.json({ error: 'فشل جلب رتب الهدف - تأكد من أنك أدمن' }, { status: 400 })
    }
    if (!Array.isArray(targetChannels)) {
      return NextResponse.json({ error: 'فشل جلب رومات الهدف - تأكد من أنك أدمن' }, { status: 400 })
    }

    // ═══════════════════════════════════════════════════════════════
    // 2️⃣ حذف كل رومات الهدف
    // ═══════════════════════════════════════════════════════════════
    
    for (const ch of targetChannels) {
      await api('DELETE', `channels/${ch.id}`)
      stats.channels_deleted++
      await sleep(100)
    }

    // ═══════════════════════════════════════════════════════════════
    // 3️⃣ حذف رتب الهدف (ما عدا @everyone)
    // ═══════════════════════════════════════════════════════════════
    
    const targetEveryone = targetRoles.find((r: any) => r.name === '@everyone')
    
    for (const r of targetRoles) {
      if (r.name === '@everyone') continue
      if (r.managed) continue // Bot roles
      
      await api('DELETE', `guilds/${targetId}/roles/${r.id}`)
      stats.roles_deleted++
      await sleep(100)
    }

    // ═══════════════════════════════════════════════════════════════
    // 4️⃣ نسخ إعدادات السيرفر
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.settings && sourceGuild && !(sourceGuild as any).message) {
      const g = sourceGuild as any
      
      await api('PATCH', `guilds/${targetId}`, {
        name: g.name,
        description: g.description || '',
        verification_level: g.verification_level || 0,
        default_message_notifications: g.default_message_notifications || 0,
        explicit_content_filter: g.explicit_content_filter || 0,
        afk_timeout: g.afk_timeout || 300,
        system_channel_flags: g.system_channel_flags || 0
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // 5️⃣ نسخ @everyone
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.roles) {
      const srcEveryone = sourceRoles.find((r: any) => r.name === '@everyone')
      
      if (srcEveryone && targetEveryone) {
        await api('PATCH', `guilds/${targetId}/roles/${targetEveryone.id}`, {
          permissions: srcEveryone.permissions,
          mentionable: srcEveryone.mentionable
        })
        roleMap[srcEveryone.id] = targetEveryone.id
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 6️⃣ نسخ الرتب بالترتيب الصحيح (من الأدنى للأعلى)
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.roles) {
      // ترتيب الرتب من الأدنى موقعاً للأعلى
      const sortedRoles = sourceRoles
        .filter((r: any) => r.name !== '@everyone' && !r.managed)
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      
      for (const role of sortedRoles) {
        const newRole = await api('POST', `guilds/${targetId}/roles`, {
          name: role.name,
          permissions: role.permissions,
          color: role.color || 0,
          hoist: role.hoist || false,
          mentionable: role.mentionable || false,
          icon: role.icon || null,
          unicode_emoji: role.unicode_emoji || null
        })
        
        if (newRole && !newRole.error && newRole.id) {
          roleMap[role.id] = newRole.id
          stats.roles_created++
        }
        
        await sleep(200)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 7️⃣ نسخ التصنيفات (Categories)
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.channels) {
      const categories = sourceChannels
        .filter((c: any) => c.type === 4)
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      
      for (const cat of categories) {
        // تحويل صلاحيات التصنيف
        const permissions = (cat.permission_overwrites || []).map((p: any) => ({
          id: roleMap[p.id] || p.id,
          allow: p.allow,
          deny: p.deny,
          type: p.type
        })).filter((p: any) => p.id)
        
        const newCat = await api('POST', `guilds/${targetId}/channels`, {
          name: cat.name,
          type: 4,
          position: cat.position || 0,
          permission_overwrites: permissions.length > 0 ? permissions : undefined
        })
        
        if (newCat && !newCat.error && newCat.id) {
          catMap[cat.id] = newCat.id
          stats.categories_created++
        }
        
        await sleep(200)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 8️⃣ نسخ الرومات (Text, Voice, etc)
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.channels) {
      const channels = sourceChannels
        .filter((c: any) => c.type !== 4) // Not category
        .sort((a: any, b: any) => (a.position || 0) - (b.position || 0))
      
      for (const ch of channels) {
        // تحويل صلاحيات الروم
        const permissions = (ch.permission_overwrites || []).map((p: any) => ({
          id: roleMap[p.id] || p.id,
          allow: p.allow,
          deny: p.deny,
          type: p.type
        })).filter((p: any) => p.id)
        
        const payload: any = {
          name: ch.name,
          type: ch.type,
          position: ch.position || 0,
          permission_overwrites: permissions.length > 0 ? permissions : undefined
        }
        
        // التصنيف الأب
        if (ch.parent_id && catMap[ch.parent_id]) {
          payload.parent_id = catMap[ch.parent_id]
        }
        
        // روم نصي (0) أو Announcements (5)
        if (ch.type === 0 || ch.type === 5) {
          payload.topic = ch.topic || null
          payload.nsfw = ch.nsfw || false
          payload.rate_limit_per_user = ch.rate_limit_per_user || 0
          payload.default_auto_archive_duration = ch.default_auto_archive_duration || 4320
        }
        
        // روم صوتي (2) أو Stage (13)
        if (ch.type === 2 || ch.type === 13) {
          payload.bitrate = ch.bitrate || 64000
          payload.user_limit = ch.user_limit || 0
          payload.rtc_region = ch.rtc_region || null
          if (ch.type === 13) {
            payload.topic = ch.topic || null
          }
        }
        
        const newCh = await api('POST', `guilds/${targetId}/channels`, payload)
        
        if (newCh && !newCh.error) {
          stats.channels_created++
        }
        
        await sleep(200)
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 9️⃣ نسخ الإيموجي
    // ═══════════════════════════════════════════════════════════════
    
    if (options?.emojis) {
      const emojis = await api('GET', `guilds/${sourceId}/emojis`)
      
      if (Array.isArray(emojis)) {
        for (const emoji of emojis) {
          // لا ننسخ الإيموجي المُدارة
          if (emoji.managed) continue
          
          const newEmoji = await api('POST', `guilds/${targetId}/emojis`, {
            name: emoji.name,
            image: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`,
            roles: (emoji.roles || [])
              .map((rId: string) => roleMap[rId])
              .filter(Boolean)
          })
          
          if (newEmoji && !newEmoji.error) {
            stats.emojis++
          }
          
          await sleep(300)
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      stats: {
        roles_deleted: stats.roles_deleted,
        roles_created: stats.roles_created,
        channels_deleted: stats.channels_deleted,
        channels_created: stats.channels_created,
        categories_created: stats.categories_created,
        emojis: stats.emojis
      },
      message: 'تم النسخ بنجاح!'
    })
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'خطأ: ' + (error.message || 'Unknown error') 
    }, { status: 500 })
  }
}
