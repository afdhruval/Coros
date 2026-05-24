import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { API_URL } from '../../../config/config';
import './auth.scss';

const api = axios.create({
    baseURL: `${API_URL}/auth`,
    withCredentials: true,
});

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) { toast.error('Email is required'); return; }
        setLoading(true);
        try {
            await api.post('/forgot-password', { email });
            toast.success('OTP sent to your email!');
            setStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        } finally { setLoading(false); }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!otp || !newPassword) { toast.error('OTP and New Password are required'); return; }
        if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
        setLoading(true);
        try {
            await api.post('/reset-password', { email, otp, newPassword });
            toast.success('Password reset successfully! Please sign in.');
            navigate('/chat');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reset password');
        } finally { setLoading(false); }
    };

    return (
        <div className="auth-modern-layout">
            <div className="auth-card-modern">

                {/* Header */}
                <div className="auth-header-minimal">
                    <span className="welcome-label">
                        {step === 1 ? 'ACCOUNT RECOVERY' : 'VERIFY OTP'}
                    </span>
                    <h1 className="main-title">
                        {step === 1 ? 'Forgot Password' : 'Reset Password'}
                    </h1>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '2rem' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{
                            flex: 1, height: '3px', borderRadius: '2px',
                            background: step >= s ? '#f5f5f5' : '#1a1a1a',
                            transition: 'background 0.4s ease'
                        }} />
                    ))}
                </div>

                {/* Step 1 : Email */}
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className="auth-form-modern">
                        <div className="modern-field">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoFocus
                            />
                        </div>

                        <button type="submit" disabled={loading} className="modern-submit-btn">
                            {loading ? 'Sending OTP...' : 'Send OTP →'}
                        </button>
                    </form>
                )}

                {/* Step 2 : OTP + New Password */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="auth-form-modern">
                        <div className="modern-success-box">
                            <i className="ri-mail-check-line"></i>
                            <span>OTP sent to <strong>{email}</strong></span>
                        </div>

                        <div className="modern-field">
                            <label>6-Digit OTP</label>
                            <input
                                type="text"
                                value={otp}
                                onChange={e => setOtp(e.target.value)}
                                placeholder="Enter OTP"
                                maxLength={6}
                                autoFocus
                                style={{ letterSpacing: '0.25em', fontWeight: '700' }}
                            />
                        </div>

                        <div className="modern-field">
                            <label>New Password</label>
                            <div className="input-with-icon">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                                    <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="modern-submit-btn">
                            {loading ? 'Resetting...' : 'Reset Password →'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            style={{ background: 'none', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer', textAlign: 'center', marginTop: '-0.5rem' }}
                        >
                            ← Back to email
                        </button>
                    </form>
                )}

                <div className="auth-switch-modern">
                    <p>Remembered it? <Link to="/login">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
