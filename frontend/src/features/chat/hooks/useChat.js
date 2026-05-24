import { useDispatch, useSelector } from "react-redux";
import { getChats, sendMessage, getMessages } from "../service/chat.api.js";

import {
    createNewChat,
    addNewMessage,
    setcurrentChatId,
    setLoading,
    setChats,
} from "../chat.slice.js";

export const useChat = () => {

    const dispatch = useDispatch();
    const user = useSelector(state => state.auth.user);

    async function handleSendMessage({ message, chatId }) {
        try {
            dispatch(setLoading(true));

            let finalChatId = chatId || "guest_chat";

            zif (!user) {
                // Guest mode: Mock chat
                dispatch(addNewMessage({
                    chatId: finalChatId,
                    message: { role: "user", content: message }
                }));

                // Simulate AI delay
                setTimeout(() => {
                    dispatch(addNewMessage({
                        chatId: finalChatId,
                        message: { 
                            role: "ai", 
                            content: `I'm in **guest mode**. To save your chats and access GPT-4, please [Sign In](/login). \n\nYour message: "${message}"` 
                        }
                    }));
                    dispatch(setLoading(false));
                }, 1000);

                dispatch(setcurrentChatId(finalChatId));
                return;
            }

            const res = await sendMessage({ message, chatId });

            console.log("SEND MESSAGE RESPONSE:", res);

            const chat = res?.chat;
            const aiMessage = res?.aiMessage;

            const apiChatId = chatId || chat?._id;

            // ✅ create chat if new
            if (!chatId && chat) {
                dispatch(createNewChat({
                    chatId: chat._id,
                    title: chat.title,
                }));
            }

            // ✅ USER MESSAGE
            dispatch(addNewMessage({
                chatId: apiChatId,
                message: {
                    role: "user",
                    content: message
                }
            }));

            // ✅ AI MESSAGE
            dispatch(addNewMessage({
                chatId: apiChatId,
                message: {
                    role: aiMessage?.role || "ai",
                    content: aiMessage?.content || "No response"
                }
            }));

            dispatch(setcurrentChatId(apiChatId));

        } catch (err) {
            console.error(err);
        } finally {
            if (user) {
                dispatch(setLoading(false));
            }
        }
    }

    async function handleGetChats() {
        try {
            dispatch(setLoading(true));

            const data = await getChats();
            const chats = data?.chat || [];

            if (!Array.isArray(chats)) {
                console.error("Chats is not array:", chats);
                return;
            }

            const formattedChats = chats.reduce((acc, chat) => {
                acc[chat._id] = {
                    id: chat._id,
                    title: chat.title,
                    messages: [],
                };
                return acc;
            }, {});

            dispatch(setChats(formattedChats));

            if (chats.length > 0) {
                dispatch(setcurrentChatId(chats[0]._id));
            }

        } catch (err) {
            console.log(err);
        } finally {
            dispatch(setLoading(false));
        }
    }

    async function handleOpenChat(chatId, chats) {
        try {
            dispatch(setcurrentChatId(chatId));

            if (chats[chatId]?.messages?.length > 0) return;

            dispatch(setLoading(true));

            const data = await getMessages(chatId);
            console.log("GET MESSAGES RESPONSE:", data);

            const messages = data?.messages || [];

            messages.forEach((msg) => {
                dispatch(addNewMessage({
                    chatId,
                    message: {
                        content: msg.content,
                        role: msg.role
                    }
                }));
            });

        } catch (err) {
            console.log(err);
        } finally {
            dispatch(setLoading(false));
        }
    }

    return {
        handleSendMessage,
        handleGetChats,
        handleOpenChat
    };
};