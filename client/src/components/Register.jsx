import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Register() {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'Student',
    program_name: '',
  });
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch programs list dynamically for registration dropdown
    api.get('/programs')
      .then(res => {
        // Only show active programs in registration
        const activeProgs = res.data.programs.filter(p => p.is_active);
        setPrograms(activeProgs);
        if (activeProgs.length > 0) {
          setForm(prev => ({ ...prev, program_name: activeProgs[0].program_name }));
        }
      })
      .catch(err => {
        console.error('Failed to fetch programs:', err);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      // Clear program name if not registering as Student
      if (name === 'role' && value !== 'Student') {
        updated.program_name = '';
      } else if (name === 'role' && value === 'Student' && programs.length > 0) {
        updated.program_name = programs[0].program_name;
      }
      return updated;
    });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-registration-otp', { email: form.email });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }
    setLoading(true);

    try {
      const payload = { ...form, otp };
      const user = await register(payload);
      toast.success(`Welcome, ${user.name}! Account created successfully.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="animated-bg" />

      <div className="w-full max-w-md animate-fade-in-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <img
            src="/aharada-logo.png"
            alt="Aharada Education"
            className="h-20 mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Join the Aharada Education Grievance Portal</p>
        </div>

        {/* Register Form Card */}
        <div className="glass-card p-8">
            {step === 1 ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label htmlFor="reg-name" className="block text-sm font-medium text-slate-600 mb-1.5">Full Name</label>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-slate-600 mb-1.5">Email Address</label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@university.edu"
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-600 mb-1.5">Phone Number</label>
                  <input
                    id="reg-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="form-input"
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className="form-input"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="reg-role" className="block text-sm font-medium text-slate-600 mb-1.5">Role</label>
                  <select
                    id="reg-role"
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="form-select w-full"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </div>

                {form.role === 'Student' && (
                  <div>
                    <label htmlFor="reg-program" className="block text-sm font-medium text-slate-600 mb-1.5">Academic Program</label>
                    <select
                      id="reg-program"
                      name="program_name"
                      value={form.program_name}
                      onChange={handleChange}
                      className="form-select w-full"
                      required
                    >
                      {programs.map((p) => (
                        <option key={p.program_code} value={p.program_name}>
                          {p.program_code} - {p.program_name}
                        </option>
                      ))}
                      {programs.length === 0 && (
                        <option value="">No programs available</option>
                      )}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full mt-4 cursor-pointer"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-slate-500 mb-4 text-center">
                  We've sent a 6-digit OTP to <strong>{form.email}</strong>. Please enter it below to verify your email.
                </p>
                <div>
                  <label htmlFor="reg-otp" className="block text-sm font-medium text-slate-600 mb-1.5 text-center">Enter OTP</label>
                  <input
                    id="reg-otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="123456"
                    className="form-input text-center tracking-widest text-lg font-bold"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary w-1/2 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-1/2 cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Verify & Register'}
                  </button>
                </div>
              </form>
            )}

          <div className="mt-5 text-center">
            <span className="text-sm text-slate-500">Already have an account? </span>
            <Link to="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
