'use client';

import useSWR from "swr"
import useSWRSubsription from "swr/subscription"
import ClientHttp, { fetcher } from "../http/http"
import { Chat, Message } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type ChatWithFirstMessage = Chat & { messages: [Message]}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatIdParam = searchParams.get("id")
  const [chatId, setChatId] = useState<string | null>(chatIdParam)
  const [messageId, setMessageId] = useState<string | null>(null)
  const { data: chats, mutate: mutateChats } = useSWR<ChatWithFirstMessage[]>('chats', fetcher, {
    fallbackData: [],
    revalidateOnFocus: false
  })
  const { data: messages, mutate: mutateMessages } = useSWR<Message[]>(chatId ? `chats/${chatId}/messages` : null, fetcher, {
    fallbackData: [],
    revalidateOnFocus: false
  })

  const {data: messageLoading, error: errorMessageLoading} = useSWRSubsription(messageId ? `/api/messages/${messageId}/events` : null, (path: string, {next}) => {
    console.log("init event source")
    const eventSource = new EventSource(path)
    eventSource.onmessage = (event) => {
      const newMessage = JSON.parse(event.data)
      next(null, newMessage.content)
    }
    eventSource.onerror = (event) => {
      eventSource.close()
      //@ts-ignore
      next(event.data, null)
    }
    eventSource.addEventListener("end", (event) => {
      eventSource.close()
      const newMessage = JSON.parse(event.data)
      mutateMessages((messages) => [...messages!, newMessage], false)
      next(null, null)
    })

    return () => {
      console.log("close event source")
      eventSource.close()
    }
  })

  console.log("messageLoading", messageLoading)
  console.log("errorMessageLoading", errorMessageLoading)

  useEffect(() => {
    setChatId(chatIdParam)
  }, [chatIdParam])

  useEffect(() => {
    const textArea = document.querySelector("#message") as HTMLTextAreaElement
    textArea.addEventListener("keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
      }
    })
    textArea.addEventListener("keyup", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        const form = document.querySelector("#form") as HTMLFormElement
        const submitButton = form.querySelector("button") as HTMLButtonElement
        form.requestSubmit(submitButton)
        return
      }
    })
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const textArea = event.currentTarget.querySelector("textarea") as HTMLTextAreaElement
    const message = textArea?.value
    if (!chatId) {
      const newChat: ChatWithFirstMessage = await ClientHttp.post("chats", { message })
      mutateChats([newChat, ...chats!], false)
      setChatId(newChat.id)
      setMessageId(newChat.messages[0].id)
    } else {
      const newMessage: Message = await ClientHttp.post(
        `chats/${chatId}/messages`, { message }
      )
      mutateMessages([...messages!, newMessage], false)
      setMessageId(newMessage.id)
    }
    textArea.value = ""
  }

  return (
    <div className="flex gap-5">
      <div className="flex flex-col">
        Sidebar
        <button type="button" onClick={() => router.push("/")}>New chat</button>
      <ul>
        {chats!.map((chat, key) => (
        <li key={key} onClick={() => router.push(`?id=${chat.id}`)}> {chat.messages[0]?.content}</li>
        )
        )}
      </ul>
      </div>
      <div>
        Center
        <ul>
          {messages!.map((message, key) => (
            <li key={key}>{message.content}</li>
          ))}
          {messageLoading && <li>{messageLoading}</li>}
          {errorMessageLoading && <li>{errorMessageLoading}</li>}
        </ul>
        <form id="form" onSubmit={onSubmit}>
          <textarea id="message" placeholder="Type your question" className="text-black"></textarea>
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  )
}
