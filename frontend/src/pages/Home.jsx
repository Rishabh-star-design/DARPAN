import { signInWithPopup } from 'firebase/auth'
import React, { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'
import { FcGoogle } from 'react-icons/fc'
import { useDispatch, useSelector } from 'react-redux'
import { setUserdata } from '../redux/userSlice'
import SideBar from '../components/SideBar'
import ChatArea from '../components/ChatArea'
import Artifact from '../components/Artifact'

function Home({ ready }) {
  const { userData } = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const root = useRef(null)
  const btnRef = useRef(null)

  const handleLogin = async (token) => {
    try {
      const { data } = await api.post('/api/auth/login', { token })
      dispatch(setUserdata(data))
    } catch (error) {
      console.log(error)
    }
  }

  const googleLogin = async () => {
    try {
      const data = await signInWithPopup(auth, googleProvider)
      const token = await data.user.getIdToken()
      await handleLogin(token)
    } catch (error) {
      console.error('Google login failed:', error)
    }
  }

  // login card entrance (starts when the intro doors open)
  useGSAP(
    () => {
      if (!ready || userData) return
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.login-wrap', { opacity: 0, duration: 0.6 })
        .from('.login-card', { y: 60, scale: 0.92, opacity: 0, duration: 1.1 }, 0.1)
        .from('.login-item', { y: 24, opacity: 0, duration: 0.8, stagger: 0.12 }, 0.4)
      gsap.to('.login-spin', { rotation: 360, duration: 6, repeat: -1, ease: 'none' })
    },
    { scope: root, dependencies: [ready, userData] }
  )

  // magnetic button: it leans toward your cursor
  const onMove = (e) => {
    const r = btnRef.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    gsap.to(btnRef.current, { x: x * 0.25, y: y * 0.35, duration: 0.4, ease: 'power3.out' })
  }
  const onLeave = () =>
    gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' })

  return (
    <div ref={root} className="h-screen flex relative z-10 text-white overflow-hidden">
      <SideBar />
      <ChatArea />
      <Artifact />

      {!userData && (
        <div className="login-wrap fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          {/* animated glowing border */}
          <div className="login-card relative w-[360px] rounded-2xl p-[1px] overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.3)]">
            <div className="login-spin absolute -inset-[100%] bg-[conic-gradient(from_0deg,transparent_0deg,#8b5cf6_90deg,transparent_180deg,#22d3ee_270deg,transparent_360deg)]" />

            <div className="relative rounded-2xl bg-[#0a0b10]/90 backdrop-blur-2xl p-8 flex flex-col gap-6">
              <div className="login-item flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-[0.35em] text-cyan-300/80">
                  SECURE ACCESS
                </span>
                <h2
                  className="text-2xl font-extrabold tracking-[0.25em] text-white"
                  style={{ fontFamily: 'Orbitron, sans-serif', textShadow: '0 0 20px #8b5cf6' }}
                >
                  DARPAN
                </h2>
                <p className="text-[13px] text-slate-400">Please login to continue using the app.</p>
              </div>

              <div className="login-item">
                <button
                  ref={btnRef}
                  onMouseMove={onMove}
                  onMouseLeave={onLeave}
                  onClick={googleLogin}
                  className="w-full flex items-center justify-center gap-3 py-[11px] rounded-xl text-sm font-medium text-black/90 bg-white hover:bg-gray-200 transition-colors duration-150 cursor-pointer"
                >
                  <FcGoogle size={15} />
                  Continue With Google
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home