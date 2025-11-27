"use client"

import { toast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: "default" | "destructive" | "success" | "warning"
}

export const useToast = () => {
  const showToast = ({ title, description, variant = "default", action }: ToastProps) => {
    const message = title || description || ""
    const fullDescription = title && description ? description : undefined

    switch (variant) {
      case "success":
        return toast.success(message, {
          description: fullDescription,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        })
      case "destructive":
        return toast.error(message, {
          description: fullDescription,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        })
      case "warning":
        return toast.warning(message, {
          description: fullDescription,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        })
      default:
        return toast(message, {
          description: fullDescription,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        })
    }
  }

  return {
    toast: showToast,
  }
}