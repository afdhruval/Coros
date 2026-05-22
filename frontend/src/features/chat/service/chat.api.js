import axios from "axios"

const api = axios.create({
    baseURL: "/api/chats", 
    withCredentials: true
})

export async function sendMessageApi({ message, chat, model, file }, signal) {
    const response = await api.post("/message", { message, chat, model, file }, { signal })
    return response.data
}

export async function getChatsApi() {
    const response = await api.get("/")
    return response.data
}

export async function getMessagesApi(chatId) {
    const response = await api.get(`/${chatId}/messages`)
    return response.data
}

export async function deleteChatApi(chatId) {
    const response = await api.delete(`/delete/${chatId}`)
    return response.data
}
