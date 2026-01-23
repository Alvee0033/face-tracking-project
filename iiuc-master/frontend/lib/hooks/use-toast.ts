"use client"

import { create } from 'zustand'

export interface Toast {
    id: string
    title: string
    description?: string
    variant?: 'default' | 'success' | 'destructive'
}

interface ToastStore {
    toasts: Toast[]
    addToast: (toast: Omit<Toast, 'id'>) => void
    removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (toast) => {
        const id = Math.random().toString(36).substring(2, 9)
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }]
        }))

        // Auto-remove after 3 seconds
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter(t => t.id !== id)
            }))
        }, 3000)
    },
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
    }))
}))

export const useToast = () => {
    const addToast = useToastStore(state => state.addToast)
    return {
        toast: addToast,
        success: (title: string, description?: string) => addToast({ title, description, variant: 'success' }),
        error: (title: string, description?: string) => addToast({ title, description, variant: 'destructive' })
    }
}
