import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import getMessages from '../features/getMessages'
import { setArtifacts, setMessages } from '../redux/messageSlice'

function ChatArea() {
  const dispatch = useDispatch()
  const { selectedConversation } = useSelector((state) => state.conversation)

  useEffect(() => {
    let cancelled = false

    const loadMessages = async () => {
      if (!selectedConversation) {
        dispatch(setMessages([]))
        dispatch(setArtifacts([]))
        return
      }

      if (selectedConversation.title == 'New Chat') return

      try {
        const data = (await getMessages(selectedConversation._id)) || []
        if (cancelled) return
        dispatch(setMessages(data))
        const latest = [...data].reverse().find((msg) => msg.artifacts && msg.artifacts.length > 0)
        dispatch(setArtifacts(latest?.artifacts || []))
      } catch (error) {
        console.log(error)
      }
    }

    loadMessages()

    return () => {
      cancelled = true
    }
  }, [selectedConversation?._id])

  return (
    <section className='flex-1 flex flex-col min-w-0 min-h-0 bg-transparent'>
      <Nav />
      <MessageList />
      <ChatInput />
    </section>
  )
}

export default ChatArea