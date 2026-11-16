import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Coins, LogOut, Menu, MessageSquare, PanelLeftIcon, PanelRight, PenSquare, Plus, User, X } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { getConversations } from '../features/getConversations'
import logOut from '../features/logOut'
import { setConversations, setSelectedConversation } from '../redux/conversationSlice'
import { setUserdata } from '../redux/userSlice'
import BillingDrawer from './BillingDrawer'

gsap.registerPlugin(useGSAP)

const iconBtn =
  'flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-cyan-300 hover:bg-white/[0.06] transition-colors duration-200 bg-transparent border-none cursor-pointer'

function Avatar({ src }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className='shrink-0 p-[1.5px] rounded-xl bg-linear-to-br from-cyan-400 to-violet-500'>
      {src && !failed ? (
        <img
          className='w-9 h-9 rounded-[10px] object-cover'
          src={src}
          alt='avatar'
          onError={() => setFailed(true)}
        />
      ) : (
        <div className='w-9 h-9 rounded-[10px] bg-[#0b0a12] flex items-center justify-center'>
          <User size={15} className='text-slate-400' />
        </div>
      )}
    </div>
  )
}

function ConversationList({ items, selectedId, compact, onSelect }) {
  return (
    <>
      {items.map((conv) => {
        const active = selectedId === conv?._id
        return (
          <div
            key={conv?._id}
            title={compact ? conv?.title || 'New Chat' : undefined}
            onClick={() => onSelect(conv)}
            className={`conv-item relative flex items-center gap-2.5 cursor-pointer mb-1 rounded-xl border transition-all duration-200 ${
              compact ? 'justify-center w-10 h-10' : 'px-3 py-2.5'
            } ${
              active
                ? 'bg-white/[0.07] border-cyan-400/25 shadow-[0_0_24px_rgba(34,211,238,0.08)]'
                : 'bg-transparent border-transparent hover:bg-white/[0.04] hover:border-white/[0.08]'
            }`}
          >
            {active && (
              <span className='absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-linear-to-b from-cyan-300 to-violet-500 shadow-[0_0_12px_#22d3ee]' />
            )}
            <div
              className={`flex items-center justify-center shrink-0 w-7 h-7 rounded-lg transition-colors duration-200 ${
                active ? 'bg-cyan-400/15 text-cyan-300' : 'bg-white/[0.05] text-slate-500'
              }`}
            >
              <MessageSquare size={13} />
            </div>
            {!compact && (
              <span className={`text-[13px] font-medium truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                {conv?.title || 'New Chat'}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}

function SideBar() {
  const dispatch = useDispatch()
  const root = useRef(null)
  const newChatRef = useRef(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showBilling, setShowBilling] = useState(false)
  const { conversations, selectedConversation } = useSelector((state) => state.conversation)
  const { userData } = useSelector((state) => state.user)
  const items = conversations || []
  const hasConversations = items.length > 0
  const plan = userData?.plan || 'free'

  useEffect(() => {
    const loadConversations = async () => {
      if (!userData?._id) {
        dispatch(setConversations([]))
        return
      }
      try {
        const data = await getConversations()
        dispatch(setConversations(data || []))
      } catch (error) {
        console.log(error)
      }
    }
    loadConversations()
  }, [userData?._id])

  useGSAP(
    () => {
      if (!hasConversations) return
      gsap.from('.conv-item', {
        x: -24,
        opacity: 0,
        duration: 0.6,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      })
    },
    { scope: root, dependencies: [hasConversations, collapsed] }
  )

  const startNewChat = () => {
    dispatch(setSelectedConversation(null))
    setMobileOpen(false)
  }

  const selectConversation = (conv) => {
    dispatch(setSelectedConversation(conv))
    setMobileOpen(false)
  }

  const handleLogout = async () => {
    try {
      await logOut()
    } catch (error) {
      console.log(error)
    } finally {
      dispatch(setUserdata(null))
      dispatch(setSelectedConversation(null))
      dispatch(setConversations([]))
    }
  }

  const onMagnetMove = (e) => {
    const r = newChatRef.current.getBoundingClientRect()
    gsap.to(newChatRef.current, {
      x: (e.clientX - (r.left + r.width / 2)) * 0.12,
      y: (e.clientY - (r.top + r.height / 2)) * 0.25,
      duration: 0.4,
      ease: 'power3.out',
    })
  }

  const onMagnetLeave = () => {
    gsap.to(newChatRef.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' })
  }

  if (collapsed) {
    return (
      <>
        <aside
          ref={root}
          data-reveal
          className='hidden lg:flex flex-col items-center w-[64px] h-screen shrink-0 py-4 gap-2 bg-[#07060b]/70 backdrop-blur-2xl border-r border-white/[0.08]'
        >
          <button aria-label='Expand sidebar' className={iconBtn} onClick={() => setCollapsed(false)}>
            <PanelRight size={18} />
          </button>

          <button
            aria-label='New chat'
            className='flex items-center justify-center w-9 h-9 rounded-xl text-white bg-linear-to-br from-violet-600 to-indigo-600 shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:opacity-90 transition-opacity duration-200 border-none cursor-pointer'
            onClick={startNewChat}
          >
            <Plus size={17} />
          </button>

          <div
            data-lenis-prevent
            className='flex-1 w-full flex flex-col items-center overflow-y-auto pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            <ConversationList
              items={items}
              selectedId={selectedConversation?._id}
              compact
              onSelect={selectConversation}
            />
          </div>

          {userData && (
            <div className='flex flex-col items-center gap-1.5'>
              <button
                aria-label='Billing'
                className='flex items-center justify-center w-9 h-9 rounded-xl text-amber-400/80 hover:text-amber-300 hover:bg-white/[0.06] transition-colors duration-200 bg-transparent border-none cursor-pointer'
                onClick={() => setShowBilling(true)}
              >
                <Coins size={16} />
              </button>
              <Avatar src={userData?.avatar} />
            </div>
          )}
        </aside>

        <BillingDrawer open={showBilling} onClose={() => setShowBilling(false)} />
      </>
    )
  }

  return (
    <>
      <button
        aria-label='Open menu'
        className='lg:hidden fixed top-3.5 left-4 z-30 flex items-center justify-center w-9 h-9 rounded-xl bg-[#07060b]/80 backdrop-blur-xl border border-white/[0.08] text-slate-300 hover:text-cyan-300 transition-colors duration-200 cursor-pointer'
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={16} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className='lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
        />
      )}

      <aside
        ref={root}
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] h-screen shrink-0 bg-[#07060b]/70 backdrop-blur-2xl border-r border-white/[0.08] transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <span className='pointer-events-none absolute right-0 top-0 h-full w-px bg-linear-to-b from-transparent via-cyan-400/40 to-transparent' />

        <div data-reveal className='flex flex-col h-full'>
          <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.08]'>
            <button
              aria-label='Collapse sidebar'
              className='hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-white/[0.06] transition-colors duration-200 bg-transparent border-none cursor-pointer'
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftIcon size={18} />
            </button>

            <button
              aria-label='Close menu'
              className='lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-white/[0.06] transition-colors duration-200 bg-transparent border-none cursor-pointer'
              onClick={() => setMobileOpen(false)}
            >
              <X size={18} />
            </button>

            <div className='flex-1 flex items-center gap-2 min-w-0'>
              <span className='relative flex h-2 w-2 shrink-0'>
                <span className='absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-ping' />
                <span className='relative inline-flex h-2 w-2 rounded-full bg-cyan-400' />
              </span>
              <span
                className='text-[15px] font-extrabold tracking-[0.28em] text-white truncate'
                style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 18px rgba(139,92,246,0.8)' }}
              >
                DARPAN
              </span>
            </div>

            <span className='font-mono text-[10px] uppercase tracking-widest text-cyan-300 bg-cyan-400/10 border border-cyan-400/25 px-2 py-0.5 rounded-full'>
              {plan}
            </span>

            <button
              aria-label='New chat'
              className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-white/[0.06] transition-colors duration-200 bg-transparent border-none cursor-pointer'
              onClick={startNewChat}
            >
              <PenSquare size={15} />
            </button>
          </div>

          <div className='px-4 pt-4 pb-1'>
            <button
              ref={newChatRef}
              onMouseMove={onMagnetMove}
              onMouseLeave={onMagnetLeave}
              onClick={startNewChat}
              className='w-full flex items-center justify-center gap-2 text-sm font-semibold tracking-wide text-white bg-linear-to-br from-violet-600 to-indigo-600 rounded-xl py-[11px] border border-white/10 cursor-pointer shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:brightness-110 transition-[filter] duration-200'
            >
              <Plus size={15} />
              New Chat
            </button>
          </div>

          <div className='px-5 pt-5 pb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500'>
            {hasConversations ? 'Recents' : 'No Recent Conversations'}
          </div>

          <div
            data-lenis-prevent
            className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            <ConversationList
              items={items}
              selectedId={selectedConversation?._id}
              onSelect={selectConversation}
            />
          </div>

          <div className='mx-2.5 h-px bg-linear-to-r from-transparent via-white/[0.12] to-transparent' />

          <div className='px-3.5 py-3.5'>
            {userData ? (
              <div className='flex items-center gap-3 rounded-2xl px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors duration-200'>
                <Avatar src={userData?.avatar} />

                <div className='flex-1 min-w-0'>
                  <p className='text-[13.5px] font-semibold text-slate-100 truncate'>{userData?.name || 'user'}</p>
                  <p className='font-mono text-[10px] uppercase tracking-widest text-cyan-300/70 mt-px'>{plan}</p>
                </div>

                <div className='flex gap-1'>
                  <button
                    aria-label='Billing'
                    onClick={() => setShowBilling(true)}
                    className='flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-amber-400/80 cursor-pointer hover:bg-white/[0.08] hover:text-amber-300 transition-all duration-200'
                  >
                    <Coins size={16} />
                  </button>
                  <button
                    aria-label='Log out'
                    onClick={handleLogout}
                    className='flex items-center justify-center w-8 h-8 rounded-lg border-none bg-transparent text-slate-500 cursor-pointer hover:bg-white/[0.08] hover:text-rose-300 transition-all duration-200'
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <button className='w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] hover:border-cyan-400/30 transition-colors duration-200'>
                Login
              </button>
            )}
          </div>
        </div>
      </aside>

      <BillingDrawer open={showBilling} onClose={() => setShowBilling(false)} />
    </>
  )
}

export default SideBar