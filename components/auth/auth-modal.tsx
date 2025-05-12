"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "@/components/auth/login-form"
import { SignUpForm } from "@/components/auth/signup-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: "login" | "signup"
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "forgot-password">(defaultTab)

  const handleSuccess = () => {
    onClose()
  }

  const handleForgotPassword = () => {
    setActiveTab("forgot-password")
  }

  const handleBackToLogin = () => {
    setActiveTab("login")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        {activeTab === "forgot-password" ? (
          <>
            <DialogHeader>
              <DialogTitle>Reset your password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <ForgotPasswordForm onSuccess={handleSuccess} onCancel={handleBackToLogin} />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Welcome to StreamSignal</DialogTitle>
              <DialogDescription>Sign in to your account or create a new one to get started.</DialogDescription>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm onSuccess={handleSuccess} onForgotPassword={handleForgotPassword} />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm onSuccess={handleSuccess} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
