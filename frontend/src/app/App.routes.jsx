import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../features/auth/pages/Login";
import Register from "../features/auth/pages/Register";
import Dashboard from "../features/chat/pages/Dashboard";
import Verify from "../features/auth/pages/Verify";
import ForgotPassword from "../features/auth/pages/ForgotPassword";
import Protected from "../features/auth/components/Protected";
import { Toaster } from 'react-hot-toast';

function AppRouter() {
    return (
        <BrowserRouter>
            <Toaster 
                position="top-right" 
                reverseOrder={false} 
                toastOptions={{
                    style: {
                        background: 'rgba(10, 10, 10, 0.85)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        padding: '14px 24px',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: "'Inter', sans-serif",
                        backdropFilter: 'blur(12px)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
                        letterSpacing: '0.01em',
                    },
                    success: {
                        duration: 3000,
                        iconTheme: {
                            primary: '#00f2fe',
                            secondary: '#0a0a0a',
                        },
                        style: {
                            borderLeft: '4px solid #00f2fe',
                        }
                    },
                    error: {
                        duration: 4000,
                        iconTheme: {
                            primary: '#ef4444',
                            secondary: '#0a0a0a',
                        },
                        style: {
                            borderLeft: '4px solid #ef4444',
                        }
                    }
                }}
            />
            <Routes>
                <Route path="/chat" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify" element={<Verify />} />
                <Route path="/" element={<Navigate to="/chat" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;