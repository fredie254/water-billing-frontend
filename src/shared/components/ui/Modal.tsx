import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const sizeClass = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Modal = ({ open, onClose, title, description, children, size = 'md', footer }: ModalProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]', sizeClass[size])}>
        {(title || description) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
              {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors ml-4 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="p-6 border-t border-gray-200 flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog = ({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmVariant = 'danger', loading, children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  loading?: boolean;
  children?: React.ReactNode;
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <p className="text-sm text-gray-600">{message}</p>
    {children}
    <div className="flex justify-end gap-3 mt-6">
      <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
      <button
        className={confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : confirmLabel}
      </button>
    </div>
  </Modal>
);
