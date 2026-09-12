import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

interface AccessDeniedPageProps {
  requiredPermission?: string;
  message?: string;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredPermission,
  message,
}) => {
  const navigate = useNavigate();
  const { language } = useAppStore();

  const isVi = language === 'vi';

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/5">
        <ShieldAlert className="w-8 h-8 text-rose-500" />
      </div>

      <h1 className="text-2xl font-bold text-slate-100 mb-2">
        {isVi ? 'Không có quyền truy cập' : 'Access Denied (403)'}
      </h1>

      <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
        {message ||
          (isVi
            ? 'Bạn không có quyền thực hiện hành động này hoặc xem tài nguyên được yêu cầu. Vui lòng liên hệ Quản trị viên hệ thống để được cấp quyền.'
            : 'You do not have the required permissions to access this page or perform this action. Please contact your system administrator.')}
      </p>

      {requiredPermission && (
        <div className="mb-6 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-amber-400">
          {isVi ? 'Quyền cần thiết:' : 'Required Permission:'} <span className="font-semibold">{requiredPermission}</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isVi ? 'Quay lại' : 'Go Back'}
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Home className="w-4 h-4" />
          {isVi ? 'Về Trang chủ' : 'Dashboard'}
        </button>
      </div>
    </div>
  );
};
