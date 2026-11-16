import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Home from './pages/Home'
import getCurrentUser from './features/getCurrentUser'
import { setUserdata } from './redux/userSlice'
import JarvisIntro from './components/JarvisIntro'
import BotScene from './components/bot/BotScene'
function App() {
  const dispatch = useDispatch()
  const { messages } = useSelector((state) => state.message)
  const [revealed, setRevealed] = useState(false)   // doors started opening
  const [introDone, setIntroDone] = useState(false) // remove intro from the page

  useEffect(() => {
    let active = true

    const getUser = async () => {
      try {
        const data = await getCurrentUser()
        if (active && data) dispatch(setUserdata(data))
      } catch (error) {
        if (active) console.error(error)
      }
    }
    getUser()

    return () => {
      active = false
    }
  }, [dispatch])

  // anything with data-reveal flies in when the doors open
  useGSAP(() => {
    if (!revealed) return
    gsap.from('[data-reveal]', {
      y: 60,
      opacity: 0,
      duration: 1.2,
      stagger: 0.12,
      ease: 'expo.out',
      clearProps: 'transform,opacity',
    })
  }, { dependencies: [revealed] })

  return (
    <>
      {!introDone && (
        <JarvisIntro onReveal={() => setRevealed(true)} onDone={() => setIntroDone(true)} />
      )}
      <BotScene compact={messages?.length > 0} />
      <Home ready={revealed} />
    </>
  )
}

export default App