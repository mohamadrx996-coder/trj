import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { token, length, count, useUnderscore, useDot } = await req.json()
    
    if (!token) {
      return NextResponse.json({ error: 'التوكن مطلوب' }, { status: 400 })
    }

    const len = Math.max(2, Math.min(10, parseInt(length) || 4))
    const total = Math.max(1, Math.min(500, parseInt(count) || 10))
    
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const extraChars = (useUnderscore ? '_' : '') + (useDot ? '.' : '')
    
    const available: string[] = []
    const taken: string[] = []
    const errors: string[] = []
    
    // Generate random username
    const generateUsername = (): string => {
      let result = ''
      const allChars = chars + extraChars
      for (let i = 0; i < len; i++) {
        result += allChars.charAt(Math.floor(Math.random() * allChars.length))
      }
      // Ensure doesn't start or end with special chars
      if (result[0] === '_' || result[0] === '.' || result[0].match(/\d/)) {
        result = chars.charAt(Math.floor(Math.random() * 26)) + result.slice(1)
      }
      if (result[result.length - 1] === '_' || result[result.length - 1] === '.') {
        result = result.slice(0, -1) + chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    
    // Check username availability
    const checkUsername = async (username: string): Promise<'available' | 'taken' | 'error'> => {
      try {
        // Create a temporary account check via Discord's username endpoint
        const res = await fetch(`https://discord.com/api/v10/users/@me`, {
          method: 'PATCH',
          headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ username })
        })
        
        if (res.status === 200) {
          // Username was changed successfully - it was available
          return 'available'
        }
        
        const data = await res.json().catch(() => ({}))
        
        if (res.status === 400 || (data as any).errors?.username) {
          // Username is taken or invalid
          return 'taken'
        }
        
        if (res.status === 429) {
          // Rate limited
          const retry = (data as any).retry_after || 1
          await new Promise(r => setTimeout(r, retry * 1000))
          return checkUsername(username)
        }
        
        return 'error'
      } catch {
        return 'error'
      }
    }
    
    // Check usernames
    const checked = new Set<string>()
    
    for (let i = 0; i < total; i++) {
      let username = generateUsername()
      
      // Ensure unique
      while (checked.has(username)) {
        username = generateUsername()
      }
      checked.add(username)
      
      const result = await checkUsername(username)
      
      if (result === 'available') {
        available.push(username)
      } else if (result === 'taken') {
        taken.push(username)
      } else {
        errors.push(username)
      }
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100))
    }

    return NextResponse.json({
      success: true,
      stats: {
        checked: total,
        available: available.length,
        taken: taken.length,
        errors: errors.length
      },
      available,
      taken,
      errors
    })
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
