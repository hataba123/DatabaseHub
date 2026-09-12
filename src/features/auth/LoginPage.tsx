import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle, Loader2, Globe } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useAppStore } from '@/stores/useAppStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const { language, setLanguage } = useAppStore();

  const isVi = language === 'vi';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!username.trim() || !password) {
      setErrorMessage(isVi ? 'Vui lòng nhập tên đăng nhập và mật khẩu.' : 'Please enter both username and password.');
      return;
    }

    try {
      await login(username.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err.message || (isVi ? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.' : 'Login failed. Please check your credentials.');
      setErrorMessage(msg);
    }
  };

  const handleDemoAccount = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-lg p-1 text-xs">
        <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
        <button
          onClick={() => setLanguage('vi')}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            language === 'vi' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          VI
        </button>
        <button
          onClick={() => setLanguage('en')}
          className={`px-2 py-1 rounded font-medium transition-colors ${
            language === 'en' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          EN
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Database className="w-6 h-6 text-emerald-400" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white font-mono">
            DB<span className="text-emerald-400">Hub</span>
          </span>
        </div>
        <h2 className="text-center text-xl font-bold text-slate-100">
          {isVi ? 'Đăng nhập hệ thống' : 'Sign in to DBHub'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {isVi
            ? 'Nền tảng Quản trị Cơ sở dữ liệu SQL Server Doanh nghiệp'
            : 'Enterprise SQL Server Database Management Platform'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-800/80 sm:rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-300 leading-relaxed font-medium">{errorMessage}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isVi ? 'Tên đăng nhập' : 'Username'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                {isVi ? 'Mật khẩu' : 'Password'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-slate-900"
                />
                {isVi ? 'Ghi nhớ phiên đăng nhập' : 'Remember session'}
              </label>
              <span className="text-slate-500 hover:text-slate-400 cursor-help" title="Contact Admin if locked">
                {isVi ? 'Quên mật khẩu?' : 'Forgot password?'}
              </span>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isVi ? 'Đang xác thực...' : 'Authenticating...'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-8 border-t border-slate-800/80 pt-6">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-3 text-center">
              {isVi ? 'Tài khoản thử nghiệm nhanh' : 'Demo Test Accounts'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoAccount('admin', 'Admin@123456')}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">admin</div>
                <div className="text-[10px] text-slate-500">Super Admin (*)</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoAccount('loi', 'Password123!')}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">loi</div>
                <div className="text-[10px] text-slate-500">DB Admin + Auditor</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoAccount('editor', 'Password123!')}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-semibold text-amber-400 group-hover:text-amber-300">editor</div>
                <div className="text-[10px] text-slate-500">Data Editor</div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoAccount('viewer', 'Password123!')}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 transition-colors group"
              >
                <div className="text-xs font-semibold text-purple-400 group-hover:text-purple-300">viewer</div>
                <div className="text-[10px] text-slate-500">Data Viewer</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
