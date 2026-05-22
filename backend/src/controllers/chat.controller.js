import { generateMessage, generateChattitle } from "../services/ai.service.js";
import chatModel from "../model/chat.model.js";
import messageModel from "../model/message.model.js"

export async function sendMessage(req, res) {
    try {
        const { message, chat: chatId, model, file } = req.body;

        // GUEST MODE: If no authenticated user, just return AI answer without saving or creating persistent chat
        if (!req.user || !req.user.id) {
            const formattedMessages = [{ role: "user", content: message }];
            const result = await generateMessage(formattedMessages, model, file);
            
            return res.status(200).json({
                chat: { _id: 'guest-' + Date.now() },
                title: "Guest Explorer",
                aiMessage: result,
                isGuest: true
            });
        }

        // AUTH MODE: Save messages and update chat history
        let title = null;
        let chat = null;

        if (!chatId) {
            title = await generateChattitle(message);
            chat = await chatModel.create({
                user: req.user.id,
                title
            });
        }

        const currentChatId = chatId || chat._id;

        await messageModel.create({
            chat: currentChatId,
            content: message,
            role: "user"
        });

        const messages = await messageModel.find({
            chat: currentChatId
        });

        const formattedMessages = messages.map(m => ({
            role: m.role === "ai" ? "assistant" : "user",
            content: m.content
        }));

        const result = await generateMessage(formattedMessages, model, file);

        await messageModel.create({
            chat: currentChatId,
            content: result,
            role: "ai"
        });

        res.status(201).json({
            chat: chat || { _id: currentChatId },
            title,
            aiMessage: result,
            isGuest: false
        });

    } catch (error) {
        console.log("ERROR in sendMessage:", error);
        res.status(500).json({
            message: "Internal Server Error",
            error: error.message
        });
    }
}

export async function getChats(req, res) {
    try {
        const user = req.user
        const chat = await chatModel.find({ user: user.id })
        res.status(200).json({
            message: "chats received successfully",
            chat
        })
    } catch (error) {
        console.log("ERROR in getChats:", error);
        res.status(500).json({ message: "Server error" });
    }
}

export async function getMessages(req, res) {
    try {
        const { chatId } = req.params

        const chat = await chatModel.findOne({
            _id: chatId,
            user: req.user.id
        })

        if (!chat) {
            return res.status(404).json({
                message: "chat not found"
            })
        }

        const messages = await messageModel.find({
            chat: chatId
        })

        res.status(200).json({
            message: "messages retrieved successfully",
            messages
        })
    } catch (error) {
        console.log("ERROR in getMessages:", error);
        res.status(500).json({ message: "Server error" });
    }
}

export async function deleteChat(req, res) {
    try {
        const { chatId } = req.params

        const chat = await chatModel.findOneAndDelete({
            _id: chatId,
            user: req.user.id
        })

        if (!chat) {
            return res.status(404).json({
                message: "chat not found"
            })
        }

        await messageModel.deleteMany({
            chat: chatId
        })

        res.status(200).json({
            message: "chat deleted successfully"
        })
    } catch (error) {
        console.log("ERROR in deleteChat:", error);
        res.status(500).json({ message: "Server error" });
    }
}
