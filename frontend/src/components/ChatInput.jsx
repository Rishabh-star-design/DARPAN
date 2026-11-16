import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Code2, FileText, Globe, ImageIcon, MessageSquare, Mic, MicOff, Paperclip, Presentation, Send, X, Zap } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import sendMessage from '../features/sendMessage'
import { createConversation } from '../features/createConversation'
import { updateConversation } from '../features/updateConversation'
import { addMessage, setArtifacts, setIsLoading, setMessages } from '../redux/messageSlice'
import { addConversation, setConvTitle, setSelectedConversation } from '../redux/conversationSlice'
import { getBotMood, setBotMood } from './bot/botMood'

const AGENTS = [
  { id: 'auto', icon: Zap, label: 'Auto' },
  { id: 'chat', icon: MessageSquare, label: 'Chat' },
  { id: 'coding', icon: Code2, label: 'Coding' },
  { id: 'pdf', icon: FileText, label: 'PDF' },
  { id: 'ppt', icon: Presentation, label: 'PPT' },
  { id: 'vision', icon: ImageIcon, label: 'Vision' },
  { id: 'search', icon: Globe, label: 'Search' },
]

function ChatInput() {
  const dispatch = useDispatch()
  const [value, setValue] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('Auto')
  const [selectedFile, setSelectedFile] = useState(null)
  const [listening, setListening] = useState(false)
  const { selectedConversation } = useSelector((state) => state.conversation)
  const { isLoading } = useSelector((state) => state.message)
  const recognitionRef = useRef(null)
  const fileRef = useRef(null)
  const idleTimer = useRef(null)

  const preview = useMemo(
    () => (selectedFile?.type?.startsWith('image/') ? URL.createObjectURL(selectedFile) : null),
    [selectedFile]
  )

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setValue(transcript)
    }

    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition

    return () => {
      recognition.onend = null
      recognition.abort()
    }
  }, [])

  useEffect(() => {
    if (isLoading) return
    const typing = value.trim().length > 0 || listening
    if (typing) setBotMood('listening')
    else if (getBotMood().mood === 'listening') setBotMood('idle')
  }, [value, listening, isLoading])

  useEffect(() => {
    return () => {
      clearTimeout(idleTimer.current)
      setBotMood('idle')
    }
  }, [])

  const toggleMic = () => {
    const recognition = recognitionRef.current
    if (!recognition) {
      alert('Speech recognition is not supported in this browser')
      return
    }
    try {
      if (listening) {
        recognition.stop()
        setListening(false)
      } else {
        recognition.start()
        setListening(true)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSendMessage = async () => {
    const prompt = value.trim()
    if (!prompt || isLoading) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
    }

    clearTimeout(idleTimer.current)
    setBotMood('thinking')
    dispatch(setIsLoading(true))

    try {
      let conversation = selectedConversation

      if (!conversation) {
        dispatch(setMessages([]))
        const conv = await createConversation()
        dispatch(setSelectedConversation(conv))
        dispatch(addConversation(conv))
        conversation = conv
      }

      if (conversation.title == 'New Chat') {
        await updateConversation({ id: conversation?._id, title: prompt })
        dispatch(setConvTitle({ conversationId: conversation?._id, title: prompt.slice(0, 40) }))
      }

      const formData = new FormData()
      formData.append('prompt', prompt)
      formData.append('conversationId', conversation?._id)
      formData.append('agent', selectedAgent.toLowerCase())
      if (selectedFile) formData.append('file', selectedFile)

      dispatch(addMessage({ role: 'user', content: prompt }))
      setValue('')

      const data = await sendMessage(formData)
      dispatch(setIsLoading(false))
      removeFile()
      dispatch(setArtifacts(data?.artifacts || []))
      dispatch(addMessage({ role: 'assistant', content: data?.answer, images: data?.images }))

      setBotMood('speaking')
      const talkTime = Math.min(Math.max((data?.answer?.length || 0) * 22, 2200), 9000)
      idleTimer.current = setTimeout(() => {
        if (getBotMood().mood === 'speaking') setBotMood('idle')
      }, talkTime)
    } catch (error) {
      console.log(error)
      setBotMood('idle')
    } finally {
      dispatch(setIsLoading(false))
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div data-reveal className='relative w-full px-3 md:px-5 pb-4 pt-3'>
      <div className='rounded-2xl p-[1px] bg-linear-to-br from-cyan-400/30 via-white/10 to-violet-500/40 focus-within:from-cyan-400/60 focus-within:to-violet-500/70 shadow-[0_0_40px_rgba(34,211,238,0.06)] transition-all duration-300'>
        <div className='relative flex flex-col gap-2.5 rounded-2xl bg-[#07060b]/80 backdrop-blur-2xl px-4 pt-3.5 pb-3 overflow-hidden'>
          {isLoading && (
            <span className='absolute top-0 left-0 h-[2px] w-full bg-linear-to-r from-transparent via-cyan-300 to-transparent animate-pulse' />
          )}

          <div className='flex gap-2 flex-wrap'>
            {AGENTS.map(({ id, icon: Icon, label }) => {
              const active = selectedAgent === label
              return (
                <button
                  key={id}
                  type='button'
                  onClick={() => setSelectedAgent(label)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-all duration-200 ${
                    active
                      ? 'bg-linear-to-r from-violet-600 to-indigo-600 text-white border-white/10 shadow-[0_0_18px_rgba(139,92,246,0.5)]'
                      : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-cyan-200 hover:border-cyan-400/30 hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon size={13} className={active ? 'text-white' : 'text-slate-500'} />
                  {label}
                </button>
              )
            })}
          </div>

          {selectedFile && (
            <div className='inline-flex w-fit items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2'>
              {selectedFile.type === 'application/pdf' ? (
                <FileText size={18} className='text-rose-400' />
              ) : (
                preview && <img src={preview} alt='preview' className='h-10 w-10 rounded-lg object-cover' />
              )}
              <div className='min-w-0'>
                <p className='max-w-[220px] truncate text-xs text-white'>{selectedFile.name}</p>
                <p className='font-mono text-[10px] text-slate-500'>
                  {Math.max(1, Math.ceil(selectedFile.size / 1024))} KB
                </p>
              </div>
              <button
                type='button'
                aria-label='Remove file'
                onClick={removeFile}
                className='ml-1 bg-transparent border-none cursor-pointer'
              >
                <X size={14} className='text-slate-500 hover:text-white' />
              </button>
            </div>
          )}

          <textarea
            rows={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Ask DARPAN anything...'
            className='w-full bg-transparent outline-none resize-none text-[14px] text-slate-100 placeholder:text-slate-600 leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          />

          <div className='flex items-center justify-between gap-3'>
            <div className='flex items-center gap-1'>
              <input
                ref={fileRef}
                type='file'
                accept='.pdf,image/*'
                hidden
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (file) setSelectedFile(file)
                }}
              />

              <button
                type='button'
                aria-label='Attach file'
                onClick={() => fileRef.current.click()}
                className='flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-cyan-300 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all duration-200 bg-transparent cursor-pointer'
              >
                <Paperclip size={16} />
              </button>

              <button
                type='button'
                aria-label='Voice input'
                onClick={toggleMic}
                className={`flex items-center justify-center w-9 h-9 rounded-lg border border-transparent transition-all duration-200 cursor-pointer ${
                  listening
                    ? 'bg-rose-500/90 text-white shadow-[0_0_18px_rgba(244,63,94,0.6)] animate-pulse'
                    : 'bg-transparent text-slate-500 hover:text-cyan-300 hover:bg-white/[0.06] hover:border-white/[0.08]'
                }`}
              >
                {listening ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
            </div>

            <span className='hidden md:block font-mono text-[10px] tracking-[0.2em] text-slate-600'>
              ENTER TO SEND · SHIFT+ENTER NEW LINE
            </span>

            <button
              type='button'
              aria-label='Send message'
              disabled={!canSend}
              onClick={handleSendMessage}
              className={`flex items-center justify-center w-9 h-9 rounded-xl border-none transition-all duration-200 ${
                canSend
                  ? 'bg-linear-to-br from-cyan-400 to-violet-600 text-white shadow-[0_0_22px_rgba(34,211,238,0.45)] hover:brightness-110 active:scale-90 cursor-pointer'
                  : 'bg-white/[0.05] text-slate-600 cursor-not-allowed'
              }`}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChatInput