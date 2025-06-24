import Link from "next/link"
import { Facebook, Instagram,Mail, Phone, MapPin ,Line} from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-background border-t py-6 md:py-10">
      <div className="container grid gap-8 md:grid-cols-3">
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Room Booking System</h3>
          <p className="text-sm text-muted-foreground">
            A modern room booking system for your organization. Book rooms, manage events, and more.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Contact</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>+66(0) 76 682245</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>sales@btc-space.com</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5" />
              <span>Blockchain Technology Center (BTC), 5/15 Chao Fah Tawan Tok Rd,Chalong, Mueang Phuket District,Phuket , 83130</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-medium">Follow Us</h3>
          <div className="flex space-x-4">
            <a
              href="https://web.facebook.com/BTCSpaceHKT/?_rdc=1&_rdr#"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Facebook className="h-5 w-5" />
              <span className="sr-only">Facebook</span>
            </a>
            <a
  href="https://www.instagram.com/btc_space/"
  target="_blank"
  rel="noopener noreferrer"
  className="text-muted-foreground hover:text-foreground transition-colors"
>
  <Instagram className="h-5 w-5" />
  <span className="sr-only">Instagram</span>
</a>

           


          </div>
          <div className="pt-4 mt-4 border-t text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Room Booking System. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}
