import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../../auth/hook/useAuth';
import { sendMessageApi, getChatsApi, getMessagesApi } from '../service/chat.api';
import './dashboard.scss';

const TypewriterText = ({ content, speed = 10, onComplete }) => {
    const [displayedText, setDisplayedText] = useState("");
    const index = useRef(0);
    useEffect(() => {
        setDisplayedText(""); index.current = 0;
        let timeout;
        const type = () => {
            if (index.current < content.length) {
                setDisplayedText((prev) => prev + content.charAt(index.current));
                index.current += 1;
                timeout = setTimeout(type, speed);
            } else if (onComplete) { onComplete(); }
        };
        type(); return () => clearTimeout(timeout);
    }, [content]);
    return (
        <span className="typewriter-container">
            <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
            </div>
            {index.current < content.length && <span className="type-cursor"></span>}
        </span>
    );
};

const UnifiedChatInput = ({
    placeholder, val, onChange, onSend, onToggleModels,
    isModelSelectorOpen, ModelSelector, isLoading, onStop,
    attachedFile, onRemoveFile, onAttachClick, currentModel,
    modelSelectorRef
}) => (
    <div className="discovery-input-wrapper">
        <div className="discovery-input-card-v2">
            <div className="card-top-row" ref={modelSelectorRef}>
                <button className="model-select-pill" onClick={onToggleModels} disabled={isLoading} title="Select AI Model" type="button">
                    <i className={currentModel?.provider === 'OpenAI' ? "ri-openai-fill" : currentModel?.provider === 'Mistral' ? "ri-sparkling-2-line" : currentModel?.provider === 'Groq' ? "ri-cpu-line" : "ri-google-fill"}></i>
                    <span>{currentModel?.name || "Select Model"}</span>
                    <i className="ri-arrow-down-s-line"></i>
                </button>
                {isModelSelectorOpen && <ModelSelector />}
            </div>

            {attachedFile && (
                <div className="attached-file-preview">
                    <i className={attachedFile.type === 'pdf' ? "ri-file-pdf-2-line pdf-icon" : "ri-image-line image-icon"}></i>
                    <span className="file-name">{attachedFile.name}</span>
                    <button className="remove-file-btn" onClick={onRemoveFile} title="Remove file" type="button">
                        <i className="ri-close-line"></i>
                    </button>
                </div>
            )}
            <textarea
                placeholder={placeholder}
                value={val}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (isLoading ? e.preventDefault() : onSend(e))}
            />
            <div className="input-actions-row">
                <div className="left"></div>
                <div className="right" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <button className="action-ic attach-btn" onClick={onAttachClick} disabled={isLoading} title="Attach PDF or Image" type="button">
                        <i className="ri-attachment-2"></i>
                    </button>

                    {isLoading ? (
                        <button className="send-circle stop-btn" onClick={onStop} title="Stop generating" style={{ background: '#e11d48', color: '#fff' }} type="button">
                            <i className="ri-stop-fill"></i>
                        </button>
                    ) : (
                        <button className="send-circle" onClick={onSend} disabled={(!val.trim() && !attachedFile) || isLoading} type="button">
                            <i className="ri-arrow-up-line"></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const Dashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const { handleGetme, handleLogout } = useAuth();
    const navigate = useNavigate();

    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'normal-dark');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isThemeSubmenuOpen, setIsThemeSubmenuOpen] = useState(false);
    const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [chatInput, setChatInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentModel, setCurrentModel] = useState({ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' });
    const [modelSearchTerm, setModelSearchTerm] = useState('');
    const [latestAiMsgId, setLatestAiMsgId] = useState(null);
    const [attachedFile, setAttachedFile] = useState(null);

    const messagesEndRef = useRef(null);
    const viewportRef = useRef(null);
    const abortControllerRef = useRef(null);
    const fileInputRef = useRef(null);
    const modelSelectorRef = useRef(null);

    const handleAttachClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const extractTextFromPdf = async (file) => {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = async function () {
                try {
                    const typedarray = new Uint8Array(this.result);
                    const pdfjsLib = window['pdfjs-dist/build/pdf'];
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(" ");
                        fullText += pageText + "\n";
                    }
                    resolve(fullText);
                } catch (err) {
                    reject(err);
                }
            };
            fileReader.onerror = (err) => reject(err);
            fileReader.readAsArrayBuffer(file);
        });
    };

    const readImageAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            if (file.type === 'application/pdf') {
                const text = await extractTextFromPdf(file);
                setAttachedFile({ name: file.name, type: 'pdf', text });
                toast.success("PDF attached and parsed successfully!");
            } else if (file.type.startsWith('image/')) {
                const base64 = await readImageAsBase64(file);
                setAttachedFile({ name: file.name, type: 'image', base64 });
                toast.success("Image attached successfully!");
            } else {
                toast.error("Unsupported file type. Please attach a PDF or an Image.");
            }
        } catch (err) {
            console.error("Error processing file:", err);
            toast.error("Failed to parse file.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
        toast.success("Generation stopped");
    };

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };

    useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

    const [freeChatsLeft, setFreeChatsLeft] = useState(() => {
        const stored = localStorage.getItem('freeChatsLeft');
        return stored !== null ? parseInt(stored) : 3;
    });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsSearchModalOpen(false);
                setIsQuotaModalOpen(false);
                setIsModelSelectorOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
                setIsModelSelectorOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        handleGetme();
    }, []);

    useEffect(() => { if (user) fetchChats(); else setChats([]); }, [user]);

    const fetchChats = async () => {
        try { const data = await getChatsApi(); setChats(data.chat || []); } catch (err) { console.error(err); }
    };

    const fetchMessages = async (chatId) => {
        try {
            setLatestAiMsgId(null);
            const data = await getMessagesApi(chatId);
            setMessages(data.messages || []);
            setCurrentChatId(chatId);
            setIsMobileSidebarOpen(false);
            setIsSearchModalOpen(false);
        } catch (err) { toast.error("Failed to load history"); }
    };

    const applyThemeSelection = (newTheme) => {
        setTimeout(() => {
            setTheme(newTheme); localStorage.setItem('theme', newTheme);
            document.documentElement.setAttribute('data-theme', newTheme);
            setIsUserMenuOpen(false);
            setIsThemeSubmenuOpen(false);
        }, 150);
    };

    const handleSignOut = () => {
        handleLogout();
        setIsUserMenuOpen(false);
        navigate('/');
    };

    const handleNewChat = () => { setCurrentChatId(null); setMessages([]); setChatInput(''); setIsMobileSidebarOpen(false); setLatestAiMsgId(null); };

    const handleSendMessage = async (e, forcedContent) => {
        if (e) e.preventDefault();
        let msgContent = forcedContent || chatInput.trim();
        if (!msgContent && !attachedFile) return;

        if (!user && freeChatsLeft <= 0) {
            setIsQuotaModalOpen(true);
            return;
        }

        setIsLoading(true); setChatInput('');

        const controller = new AbortController();
        abortControllerRef.current = controller;

        let payloadMessage = msgContent;
        let fileObj = null;

        if (attachedFile) {
            if (attachedFile.type === 'pdf') {
                payloadMessage = `[Attached Document: ${attachedFile.name}]\n\n--- DOCUMENT CONTENT ---\n${attachedFile.text}\n--- END OF DOCUMENT ---\n\n${msgContent || "Please review this PDF."}`;
                msgContent = `[Uploaded Document: ${attachedFile.name}]\n\n${msgContent || "Please review this PDF."}`;
            } else if (attachedFile.type === 'image') {
                fileObj = {
                    type: 'image',
                    name: attachedFile.name,
                    base64: attachedFile.base64
                };
                msgContent = `[Uploaded Image: ${attachedFile.name}]\n\n${msgContent || "Please review this image."}`;
                payloadMessage = msgContent;
            }
            setAttachedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }

        try {
            const tempMsg = { _id: 'user-' + Date.now(), content: msgContent, role: 'user' };
            setMessages(prev => [...prev, tempMsg]);

            const data = await sendMessageApi(
                { message: payloadMessage, chat: currentChatId, model: currentModel.id, file: fileObj },
                controller.signal
            );

            if (!user) {
                const nextFree = freeChatsLeft - 1;
                setFreeChatsLeft(nextFree);
                localStorage.setItem('freeChatsLeft', nextFree.toString());
            }

            if (!currentChatId && !data.isGuest) {
                setCurrentChatId(data.chat._id); fetchChats();
            } else if (data.isGuest) {
                setCurrentChatId(data.chat._id);
            }

            const aiId = 'ai-' + Date.now();
            setLatestAiMsgId(aiId);
            setMessages(prev => [...prev, { _id: aiId, content: data.aiMessage, role: 'ai' }]);
        } catch (err) {
            if (err.name === 'CanceledError' || err.name === 'AbortError' || err.message === 'canceled') {
                console.log("Request cancelled by user");
            } else {
                toast.error("Error sending message");
                console.error(err);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleEditPrompt = (content) => {
        setChatInput(content);
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    const groupChatsByDate = (chatList) => {
        const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], 'Older': [] };
        const now = new Date();
        (chatList || []).forEach(chat => {
            if (!chat) return;
            const date = new Date(chat.createdAt || Date.now());
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) groups.Today.push(chat);
            else if (diffDays === 1) groups.Yesterday.push(chat);
            else if (diffDays < 7) groups['Last 7 Days'].push(chat);
            else groups.Older.push(chat);
        });
        return groups;
    };

    const filteredChats = (chats || []).filter(chat => chat && chat.title && chat.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const groupedChats = groupChatsByDate(filteredChats);

    const models = [
        {
            category: 'OpenAI', list: [
                { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' }
            ]
        },
        {
            category: 'Google AI', list: [
                { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
                { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'Google' }
            ]
        },
        {
            category: 'Groq', list: [
                { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'Groq' }
            ]
        },
        {
            category: 'Mistral AI', list: [
                { id: 'mistral-small', name: 'Mistral Small', provider: 'Mistral' }
            ]
        }
    ];

    const filteredModels = models.map(cat => ({
        ...cat,
        list: cat.list.filter(m => m.name.toLowerCase().includes(modelSearchTerm.toLowerCase()))
    })).filter(cat => cat.list.length > 0);

    const ModelSelector = () => {
        const selectedRef = useRef(null);
        useEffect(() => {
            if (selectedRef.current) {
                selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }, []);
        return (
            <div className="model-selector-popover-v2 animate-popover">
                <div className="pop-header-v2">
                    <i className="ri-search-line"></i>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search models..."
                        value={modelSearchTerm}
                        onChange={e => { e.stopPropagation(); setModelSearchTerm(e.target.value); }}
                        onClick={e => e.stopPropagation()}
                    />
                </div>
                <div className="pop-body-v2">
                    {filteredModels.map(cat => (
                        <div key={cat.category} className="cat-section">
                            <p className="cat-title">{cat.category}</p>
                            {cat.list.map(m => (
                                <div
                                    key={m.id}
                                    ref={currentModel.id === m.id ? selectedRef : null}
                                    className={`m-row ${currentModel.id === m.id ? 'selected' : ''}`}
                                    onClick={(e) => { e.stopPropagation(); setCurrentModel(m); setIsModelSelectorOpen(false); setModelSearchTerm(''); }}
                                >
                                    <div className="m-icon-box"><i className={m.provider === 'OpenAI' ? "ri-openai-fill" : m.provider === 'Mistral' ? "ri-sparkling-2-line" : m.provider === 'Groq' ? "ri-cpu-line" : "ri-google-fill"}></i></div>
                                    <span className="m-name">{m.name}</span>
                                    {currentModel.id === m.id && <i className="ri-check-line select-check"></i>}
                                </div>
                            ))}
                        </div>
                    ))}
                    {filteredModels.length === 0 && (
                        <p className="no-models-msg">No models found</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`dashboard-layout ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
            {isMobileSidebarOpen && <div className="sidebar-overlay active" onClick={() => setIsMobileSidebarOpen(false)} />}

            {isSearchModalOpen && (
                <div className="global-search-overlay" onClick={() => setIsSearchModalOpen(false)}>
                    <div className="global-search-modal animate-popover" onClick={e => e.stopPropagation()}>
                        <div className="search-header">
                            <i className="ri-search-line"></i>
                            <input autoFocus type="text" placeholder="Search your chats..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <kbd onClick={() => setIsSearchModalOpen(false)}>ESC</kbd>
                        </div>
                        <div className="search-results-body">
                            {Object.entries(groupedChats).map(([label, list]) => list.length > 0 && (
                                <div key={label} className="search-group">
                                    <h4 className="group-label">{label}</h4>
                                    {list.map(chat => (
                                        <div key={chat._id} className="search-chat-item" onClick={() => fetchMessages(chat._id)}>
                                            <div className="chat-info"><i className="ri-message-3-line"></i><span className="chat-title">{chat.title}</span></div>
                                            <span className="chat-time">{new Date(chat.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {isQuotaModalOpen && (
                <div className="global-search-overlay" onClick={() => setIsQuotaModalOpen(false)}>
                    <div className="global-search-modal quota-modal animate-popover" onClick={e => e.stopPropagation()}>
                        <div className="quota-content">
                            <i className="ri-error-warning-line main-icon"></i>
                            <h2>Free Quota Exhausted</h2>
                            <p>You have used your 3 free guest messages. <br /> Please sign in to continue chatting with COROS.</p>
                            <div className="quota-actions">
                                <button className="login-primary" onClick={() => navigate('/login')}>Sign In</button>
                                <button className="cancel-secondary" onClick={() => setIsQuotaModalOpen(false)}>Maybe Later</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-content">
                    <div className="top-nav-area">
                        <div className="logo-row-premium">
                            <div className="logo-group"><div className="premium-logo-box"><div className="inner-circle"></div></div><span className="logo-name">COROS</span></div>
                            <button className="sidebar-toggle-btn" onClick={() => { setIsSidebarOpen(false); setIsMobileSidebarOpen(false); }}><i className="ri-layout-left-line"></i></button>
                        </div>
                        <div className="action-buttons-stack">
                            <button className="nav-item highlighted main-new-chat" onClick={handleNewChat}><i className="ri-add-line"></i><span>New Chat</span></button>
                            <button className="nav-item" onClick={() => setIsSearchModalOpen(true)}><i className="ri-search-line"></i><span>Search</span></button>
                        </div>
                    </div>
                    <div className="middle-list-area">
                        <div className="list-label">RECENT</div>
                        <div className="chats-list">
                            {chats.slice(0, 15).map(chat => (
                                <div key={chat._id} className={`chat-row-item ${currentChatId === chat._id ? 'active' : ''}`} onClick={() => fetchMessages(chat._id)}><span className="title">{chat.title}</span></div>
                            ))}
                        </div>
                    </div>
                    <div className="sidebar-footer-v2">
                        {user ? (
                            <div className="user-area-relative">
                                {isUserMenuOpen && (
                                    <div className="user-popover-box-fixed-v2 animate-popover">
                                        {!isThemeSubmenuOpen ? (
                                            <>
                                                <div className="pop-header-v3"><p className="username">{user.username}</p><p className="email">{user.email}</p></div>
                                                <div className="pop-menu-v3">
                                                    <button className="pop-btn" onClick={(e) => { e.stopPropagation(); setIsThemeSubmenuOpen(true); }}><i className="ri-sun-line"></i><span>Theme</span></button>
                                                    <button className="pop-btn logout" onClick={handleSignOut}><i className="ri-logout-box-r-line"></i><span>Log out</span></button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="pop-header-v3 submenu">
                                                    <button className="back-btn" onClick={(e) => { e.stopPropagation(); setIsThemeSubmenuOpen(false); }}><i className="ri-arrow-left-s-line"></i></button>
                                                    <p className="title">Theme</p>
                                                </div>
                                                <div className="pop-menu-v3">
                                                    <button className={`pop-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => applyThemeSelection('light')}><i className="ri-sun-line"></i><span>Light</span></button>
                                                    <button className={`pop-btn ${theme === 'normal-dark' ? 'active' : ''}`} onClick={() => applyThemeSelection('normal-dark')}><i className="ri-moon-line"></i><span>Dark</span></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="user-pill-v2" onClick={() => { setIsUserMenuOpen(!isUserMenuOpen); setIsThemeSubmenuOpen(false); }}>
                                    <div className="avatar-circle-green">
                                        {user.username.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                                    </div>
                                    <div className="user-info-meta">
                                        <span className="name">{user.username}</span>
                                        <span className="email">{user.email}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button className="user-pill-v2 signin" onClick={() => navigate('/login')}><div className="avatar-circle"><i className="ri-user-line"></i></div><span className="name">Sign In</span></button>
                        )}
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <button className="mobile-hamburger-btn" onClick={() => setIsMobileSidebarOpen(true)}><i className="ri-menu-line"></i></button>
                {!isSidebarOpen && <button className="floating-sidebar-toggle desktop-only" onClick={() => setIsSidebarOpen(true)}><i className="ri-layout-left-line"></i></button>}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf,image/*"
                    style={{ display: 'none' }}
                />

                <div className="chat-window-viewport" ref={viewportRef}>
                    {!currentChatId && messages.length === 0 ? (
                        <div className="discovery-screen-v2">
                            <h1 className="hero-title">What can I help with?</h1>
                            <div className="hero-input-zone">
                                <UnifiedChatInput
                                    placeholder="Ask anything..."
                                    val={chatInput}
                                    onChange={setChatInput}
                                    onSend={handleSendMessage}
                                    onToggleModels={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                                    isModelSelectorOpen={isModelSelectorOpen}
                                    ModelSelector={ModelSelector}
                                    isLoading={isLoading}
                                    onStop={handleStopGeneration}
                                    attachedFile={attachedFile}
                                    onRemoveFile={handleRemoveFile}
                                    onAttachClick={handleAttachClick}
                                    currentModel={currentModel}
                                    modelSelectorRef={modelSelectorRef}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="document-style-flow">
                            {messages.map((m) => (
                                <div key={m._id} className={`doc-msg-row ${m.role}`}>
                                    {m.role === 'user' ? (
                                        <div className="user-msg-container">
                                            <div className="user-text-box">{m.content}</div>
                                            <div className="user-msg-actions">
                                                <button onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied to clipboard!"); }} title="Copy prompt"><i className="ri-file-copy-line"></i></button>
                                                <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied! Share prompt."); }} title="Share prompt"><i className="ri-share-box-line"></i></button>
                                                <button onClick={() => handleEditPrompt(m.content)} title="Edit prompt"><i className="ri-pencil-line"></i></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="ai-response-body">
                                            <div className="content-wrapper">
                                                {m._id === latestAiMsgId ? (
                                                    <TypewriterText content={m.content} speed={10} onComplete={() => setLatestAiMsgId(null)} />
                                                ) : (<div className="markdown-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>)}
                                            </div>
                                            <div className="ai-toolbar-left">
                                                <button className="tool-btn" onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Copied to clipboard!"); }} title="Copy response"><i className="ri-file-copy-line"></i></button>
                                                <button className="tool-btn" onClick={() => toast.success("Liked response!")} title="Good response"><i className="ri-thumb-up-line"></i></button>
                                                <button className="tool-btn" onClick={() => toast.success("Disliked response!")} title="Bad response"><i className="ri-thumb-down-line"></i></button>
                                                <button className="tool-btn" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied! Share response."); }} title="Share response"><i className="ri-share-box-line"></i></button>
                                                <button className="tool-btn" onClick={() => handleSendMessage(null, "Regenerate")} title="Regenerate response"><i className="ri-restart-line"></i></button>
                                            </div>
                                            <div className="msg-divider"></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isLoading && (
                                <div className="doc-msg-row ai loading"><div className="modern-typing"><span></span><span></span><span></span></div></div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {(currentChatId || messages.length > 0) && (
                    <div className="chat-input-wrapper-fixed">
                        <div className="inner-input-container">
                            <UnifiedChatInput
                                placeholder="Ask anything..."
                                val={chatInput}
                                onChange={setChatInput}
                                onSend={handleSendMessage}
                                onToggleModels={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                                isModelSelectorOpen={isModelSelectorOpen}
                                ModelSelector={ModelSelector}
                                isLoading={isLoading}
                                onStop={handleStopGeneration}
                                attachedFile={attachedFile}
                                onRemoveFile={handleRemoveFile}
                                onAttachClick={handleAttachClick}
                                currentModel={currentModel}
                                modelSelectorRef={modelSelectorRef}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
export default Dashboard;