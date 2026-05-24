import React, { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../hook/useAuth'
import { useSelector } from 'react-redux'
import { toast } from 'react-hot-toast'
import { API_URL } from '../../../config/config'
import './auth.scss'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const user = useSelector(state => state.auth.user)
    const authLoading = useSelector(state => state.auth.loading)

    const navigate = useNavigate()
    const { handleLogin } = useAuth()

    if (!authLoading && user) {
        return <Navigate to="/chat" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.trim() || !password.trim()) return
        setLoading(true)
        try {
            await handleLogin(email, password)
            toast.success('Sign in successful!')
            navigate("/chat")
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid email or password')
        } finally { setLoading(false) }
    }

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/auth/google`
    }

    return (
        <div className="auth-modern-layout dark">
            <div className="auth-card-modern">
                <div className="auth-header-minimal">
                    <span className="welcome-label">WELCOME BACK</span>
                    <h1 className="main-title">Sign in to COREOS</h1>
                </div>

                <form onSubmit={handleSubmit} className="auth-form-modern">
                    <div className="modern-field">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                    </div>

                    <div className="modern-field">
                        <div className="label-row">
                            <label>Password</label>
                            <Link to="/forgot-password" style={{ color: '#666', fontSize: '12px', fontWeight: '500' }}>Forgot?</Link>
                        </div>
                        <div className="input-with-icon">
                            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                                <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="modern-submit-btn">
                        {loading ? 'Sign in...' : 'Sign in →'}
                    </button>
                </form>

                <div className="auth-divider-modern"><span>or</span></div>

                <button onClick={handleGoogleLogin} className="google-auth-btn-modern">
                    <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                    Continue with Google
                </button>

                <div className="auth-switch-modern">
                    <p>No account? <Link to="/register">Create one</Link></p>
                </div>
            </div>
        </div>
    )
}
export default Login