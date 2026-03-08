"use client"

import { useToastStore } from '@/lib/hooks/use-toast'

export function ToastContainer() {
    const toasts = useToastStore(state => state.toasts)
    const removeToast = useToastStore(state => state.removeToast)

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            pointer-events-auto min-w-[300px] rounded-lg shadow-lg p-4 
            animate-in slide-in-from-top-2 fade-in duration-300
            ${toast.variant === 'success' ? 'bg-green-50 border border-green-200' : ''}
            ${toast.variant === 'destructive' ? 'bg-red-50 border border-red-200' : ''}
            ${!toast.variant || toast.variant === 'default' ? 'bg-white border border-gray-200' : ''}
          `}
                    onClick={() => removeToast(toast.id)}
                >
                    <div className="flex items-start gap-3">
                        {toast.variant === 'success' && (
                            <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                        {toast.variant === 'destructive' && (
                            <div className="flex-shrink-0 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                        <div className="flex-1">
                            <p className={`font-semibold text-sm ${toast.variant === 'success' ? 'text-green-900' :
                                toast.variant === 'destructive' ? 'text-red-900' :
                                    'text-gray-900'
                                }`}>
                                {toast.title}
                            </p>
                            {toast.description && (
                                <p className={`text-sm mt-1 ${toast.variant === 'success' ? 'text-green-700' :
                                    toast.variant === 'destructive' ? 'text-red-700' :
                                        'text-gray-600'
                                    }`}>
                                    {toast.description}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}
