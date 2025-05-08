"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "./login-form"
import { SignUpForm } from "./signup-form"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: "login" | "signup"
  title?: string
  description?: string
  onAuthSuccess?: () => void
}

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login",
  title = "Authentication",
  description = "Sign in to your account or create a new one.",
  onAuthSuccess,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  const handleAuthSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <LoginForm onSuccess={handleAuthSuccess} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm onSuccess={handleAuthSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
