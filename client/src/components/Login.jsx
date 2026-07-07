import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password / OTP Reset flow states
  const [flow, setFlow] = useState('login'); // 'login' | 'forgot' | 'verify' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Fetch user info from Google
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(res => res.json());

        // Send Google profile details to backend
        const response = await api.post('/auth/google', {
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
        });

        if (response.data.token) {
          googleLogin(response.data.token, response.data.user);
          toast.success(`Successfully signed in via Google as ${response.data.user.name}!`);
          navigate('/dashboard');
        }
      } catch (err) {
        toast.error(err.response?.data?.error || 'Google Login failed on server');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Sign In was unsuccessful');
    }
  });

  // Forgot Password Action
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('OTP sent to your email.');
      setFlow('verify');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP Action
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email: forgotEmail, otp });
      toast.success('OTP verified. Set your new password.');
      setFlow('reset');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset Password Action
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter your new password.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: forgotEmail,
        otp,
        new_password: newPassword,
      });
      toast.success('Password reset successfully. Please login.');
      setFlow('login');
      setEmail(forgotEmail);
      setPassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animated-bg" />

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Brand Logo & Heading */}
        <div className="text-center mb-8">
          <img
            src="/aharada-logo.png"
            alt="Aharada Education"
            className="h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold gradient-text">Aharada Education</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Student Grievance Management Portal</p>
        </div>

        {/* Dynamic Card based on Flow */}
        <div className="glass-card p-8">
          {flow === 'login' && (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-6">Sign in to your account</h2>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-slate-600 mb-2">
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="login-password" className="block text-sm font-medium text-slate-600">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setFlow('forgot')}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="form-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  id="login-submit"
                  disabled={loading}
                  className="btn-primary w-full cursor-pointer"
                >
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </form>

              {/* Google Sign In Option */}
              <div className="mt-5">
                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative px-3 bg-white text-xs text-slate-400 font-semibold uppercase">Or continue with</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-all cursor-pointer shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.97 1 12 1 7.24 1 3.19 3.73 1.24 7.7l3.85 2.99C6.01 7.28 8.76 5.04 12 5.04z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.45h6.47c-.28 1.48-1.12 2.73-2.38 3.58v2.99h3.85c2.25-2.07 3.55-5.12 3.55-8.68z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.09 13.59a7.11 7.11 0 0 1 0-3.18L1.24 7.42a11.96 11.96 0 0 0 0 9.17l3.85-3z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.85-2.99c-1.1.74-2.5 1.18-4.11 1.18-3.24 0-5.99-2.24-6.97-5.26l-3.85 2.99C3.19 20.27 7.24 23 12 23z"
                    />
                  </svg>
                  Sign in with Google Mail
                </button>
              </div>

              <div className="mt-6 text-center">
                <span className="text-sm text-slate-500">Don't have an account? </span>
                <Link to="/register" className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                  Register here
                </Link>
              </div>
            </>
          )}

          {flow === 'forgot' && (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Forgot Password?</h2>
              <p className="text-xs text-slate-500 mb-6">Enter your email and we'll send you a 6-digit OTP to reset your password.</p>

              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@university.edu"
                    className="form-input"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFlow('login')}
                    className="btn-secondary w-1/2 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-1/2 cursor-pointer"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            </>
          )}

          {flow === 'verify' && (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Verify OTP</h2>
              <p className="text-xs text-slate-500 mb-6">A 6-digit OTP has been sent to {forgotEmail}. Please check your inbox.</p>

              <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="form-input text-center tracking-widest text-lg font-bold"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFlow('forgot')}
                    className="btn-secondary w-1/2 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-1/2 cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </div>
              </form>
            </>
          )}

          {flow === 'reset' && (
            <>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Set New Password</h2>
              <p className="text-xs text-slate-500 mb-6">Create a secure new password for your account.</p>

              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full pt-2 cursor-pointer"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
