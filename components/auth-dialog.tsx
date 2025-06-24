"use client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { UserCircle, LogIn, UserPlus } from "lucide-react"

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  packageName: string
}

export function AuthDialog({ isOpen, onClose, packageName }: AuthDialogProps) {
  const router = useRouter()

  const handleLogin = () => {
    router.push("/login")
  }

  const handleSignup = () => {
    router.push("/register")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
          <DialogDescription>You need to be logged in to select the {packageName} package.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex items-center justify-center">
            <UserCircle className="h-16 w-16 text-primary opacity-80" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Please log in to your existing account or create a new account to continue with your package selection.
          </p>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row sm:justify-center gap-2">
          <Button onClick={handleLogin} className="flex-1">
            <LogIn className="mr-2 h-4 w-4" />
            Log In
          </Button>
          <Button onClick={handleSignup} variant="outline" className="flex-1">
            <UserPlus className="mr-2 h-4 w-4" />
            Sign Up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
