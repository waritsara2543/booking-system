"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PlusCircle,
  Users,
  MapPin,
  Wifi,
  Coffee,
  Tv,
  Printer,
  Clock,
  Zap,
  ChevronRight,
  Star,
  ArrowRight,
  Mail,
  Phone,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import Cookies from "js-cookie"
import { RoomCarousel } from "@/components/room-carousel"
import { LocationMapModal } from "@/components/location-map-modal"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { UpcomingEvents } from "@/components/upcoming-events"
import { motion } from "framer-motion"

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const adminCookie = Cookies.get("isAdmin")
    setIsAdmin(adminCookie === "true")
  }, [])

  const testimonials = [
    {
      content:
        "This coworking space transformed our remote team's productivity. The meeting rooms are perfect for client presentations and team collaborations.",
      author: "Sarah Johnson",
      role: "Marketing Director",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      content:
        "Incredible amenities, fast WiFi, and the staff is always helpful. The meeting rooms are well-equipped with all the tech we need.",
      author: "Michael Chen",
      role: "Tech Entrepreneur",
      avatar: "/placeholder.svg?height=40&width=40",
    },
    {
      content:
        "As a freelancer, having access to professional meeting spaces for client meetings has been a game-changer for my business.",
      author: "Amelia Wilson",
      role: "Graphic Designer",
      avatar: "/placeholder.svg?height=40&width=40",
    },
  ]

  const faqItems = [
    {
      question: "How do I book a meeting room?",
      answer:
        "You can book a meeting room by clicking on the 'Book a Room' button on our website. Select your preferred date, time, and meeting room, then complete the booking form with your details.",
    },
    {
      question: "What amenities are included with meeting rooms?",
      answer:
        "All meeting rooms come equipped with high-speed Wi-Fi, video conferencing capabilities, whiteboards, HDMI connections, and complimentary coffee and water. Premium rooms also include smart TVs and enhanced audio systems.",
    },
    {
      question: "Can I cancel or reschedule my booking?",
      answer:
        "Yes, you can cancel or reschedule your booking up to 24 hours before your reserved time without any penalty. For changes within 24 hours, please contact our support team directly.",
    },
    {
      question: "Are there discounts for members?",
      answer:
        "Yes, members receive preferential rates on all meeting room bookings, with discounts varying based on your membership tier. Premium members also receive a monthly allocation of free booking hours.",
    },
    {
      question: "Can I get technical support during my meeting?",
      answer:
        "On-site technical support is available during business hours. For after-hours meetings, we provide detailed equipment guides and an emergency support line.",
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full relative overflow-hidden">
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-black/70 to-black/50 z-10"></div>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster="/placeholder.svg?height=720&width=1280"
          >
            <source src="/meeting-room-video.mp4" type="video/mp4" />
          </video>

          <div className="container relative z-20 px-4 md:px-6 py-24 md:py-32 lg:py-40 flex flex-col items-center justify-center">
            <div className="max-w-3xl text-center">
              <motion.div
                className="mb-6 inline-block rounded-full bg-primary/10 px-3 py-1 text-sm text-primary backdrop-blur-sm"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Premium Coworking Space in Phuket
              </motion.div>
              <motion.h1
                className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl text-white drop-shadow-md"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Your Perfect Meeting Space Awaits
              </motion.h1>
              <motion.p
                className="mx-auto max-w-[700px] text-white/90 text-lg md:text-xl mt-6 drop-shadow-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                Book modern, fully-equipped meeting rooms for your next business meeting, presentation, or team
                collaboration session.
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-4 sm:space-x-4 w-full max-w-md justify-center mt-8 mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <Link href="/new" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full bg-primary hover:bg-primary/90">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Book a Room
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full border-white text-white bg-black/30 hover:bg-white/20"
                  onClick={() => setShowLocationModal(true)}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  View Location
                </Button>
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent z-10"></div>
        </section>

        {/* Stats Section */}
        <section className="w-full py-12 md:py-16 border-b relative overflow-hidden">
          {/* Background Graphics */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-primary/10 rounded-full"></div>
          <div className="absolute top-1/4 left-1/3 w-12 h-12 bg-primary/10 rounded-full"></div>

          {/* Grid pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

          <div className="container grid gap-6 md:gap-10 sm:grid-cols-2 md:grid-cols-4 relative z-10">
            <motion.div
              className="flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl font-bold text-primary mb-2">10+</div>
              <div className="text-muted-foreground">Meeting Rooms</div>
            </motion.div>
            <motion.div
              className="flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Happy Members</div>
            </motion.div>
            <motion.div
              className="flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Access Available</div>
            </motion.div>
            <motion.div
              className="flex flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl font-bold text-primary mb-2">100%</div>
              <div className="text-muted-foreground">Customer Satisfaction</div>
            </motion.div>
          </div>
        </section>

        {/* Room Carousel Section */}
        <section className="w-full py-16 md:py-20 bg-muted/30 relative overflow-hidden">
          {/* Abstract shapes */}
          <div className="absolute top-0 right-0 w-1/3 h-1/3">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10">
              <path
                fill="currentColor"
                d="M42.8,-73.2C56.9,-67.3,70.8,-58.9,79.4,-46.4C88,-33.9,91.3,-17,90.2,-0.6C89.1,15.7,83.6,31.4,74.6,44.8C65.6,58.2,53.1,69.3,39,75.9C24.9,82.5,9.1,84.6,-6.9,83.8C-22.9,83,-39.1,79.3,-51.5,70.3C-63.9,61.3,-72.5,47,-78.3,31.7C-84.1,16.3,-87.1,-0.1,-83.1,-14.4C-79.1,-28.7,-68.1,-40.9,-55.6,-47.4C-43.1,-53.9,-29.1,-54.7,-16.5,-61.4C-3.9,-68.1,7.3,-80.7,20.4,-83.1C33.5,-85.5,48.6,-77.7,42.8,-73.2Z"
                transform="translate(100 100)"
              />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 w-1/4 h-1/4">
            <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full opacity-10">
              <path
                fill="currentColor"
                d="M47.7,-79.1C62.9,-71.9,77.2,-61.7,84.6,-47.5C92,-33.3,92.5,-15.1,89.3,1.8C86.2,18.8,79.3,34.5,69.5,48.1C59.7,61.7,46.9,73.2,32.2,79.1C17.5,85.1,0.8,85.5,-15.8,82.8C-32.5,80.1,-49.1,74.3,-62.3,63.5C-75.5,52.7,-85.3,36.9,-89.3,19.8C-93.3,2.7,-91.5,-15.8,-84.2,-31.1C-76.9,-46.4,-64.1,-58.5,-49.6,-65.9C-35.1,-73.3,-18.9,-76,-1.9,-73C15.1,-70,32.5,-61.3,47.7,-79.1Z"
                transform="translate(100 100)"
              />
            </svg>
          </div>

          {/* Workspace-themed background elements */}
          <div className="absolute top-1/4 right-1/4 opacity-10">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V6Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M4 9H20" stroke="currentColor" strokeWidth="2" />
              <path d="M8 4V9" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <div className="absolute bottom-1/4 left-1/4 opacity-10">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.0113 9.77251C4.28059 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>

          <div className="container relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <div>
                <h2 className="text-3xl font-bold">Our Premium Meeting Rooms</h2>
                <p className="text-muted-foreground mt-2">Find the perfect space for your next meeting or event</p>
              </div>
              <Link href="/new">
                <Button variant="outline" className="group">
                  View All Rooms
                  <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition" />
                </Button>
              </Link>
            </div>
            <RoomCarousel />
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-16 md:py-24 lg:py-28 relative overflow-hidden">
          {/* Geometric background patterns */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-25"></div>

          {/* Abstract shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full"></div>
            <div className="absolute top-1/2 -right-48 w-96 h-96 bg-primary/5 rounded-full"></div>
          </div>

          {/* Workspace icons */}
          <div className="absolute top-20 right-10 opacity-5 rotate-12">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9 17H15M9 17V13C9 11.8954 9.89543 11 11 11H13C14.1046 11 15 11.8954 15 13V17M9 17H5V7H19V17H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="absolute bottom-20 left-10 opacity-5 -rotate-12">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col text-center mb-12 md:mb-16">
              <h2 className="text-3xl font-bold mb-4">Premium Workspace Amenities</h2>
              <p className="text-muted-foreground mx-auto max-w-[700px]">
                Everything you need for a productive workday in our modern coworking environment
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors duration-300">
                      <Wifi className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>High-Speed Internet</CardTitle>
                    <CardDescription>
                      Gigabit fiber connection with reliable coverage throughout the space.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p>Experience lag-free video conferencing and fast downloads with our enterprise-grade Wi-Fi.</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors duration-300">
                      <Tv className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Smart Presentation Tools</CardTitle>
                    <CardDescription>Modern AV equipment in every meeting room.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p>4K displays, wireless screen sharing, and integrated video conferencing systems ready to use.</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors duration-300">
                      <Coffee className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Complimentary Refreshments</CardTitle>
                    <CardDescription>Premium coffee, tea, and filtered water available.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p>Keep your team energized with our selection of quality beverages throughout your meeting.</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors duration-300">
                      <Printer className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Business Services</CardTitle>
                    <CardDescription>Printing, scanning, and administrative support.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p>
                      Full-service business center with everything you need to stay productive during your meetings.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors duration-300">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Flexible Hours</CardTitle>
                    <CardDescription>Access when you need it, early morning to late evening.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p>24/7 access available for premium members with secure keyless entry system.</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="flex flex-col h-full group hover:shadow-lg transition-all duration-300 border-primary/10 hover:border-primary/30">
                  <CardHeader>
                    <div className="p-2 rounded-lg bg-primary/10 w-fit mb-3 group-hover:bg-primary/20 transition-colors duration-300">
                      <Zap className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Technical Support</CardTitle>
                    <CardDescription>Onsite IT assistance available when you need it.</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p>Never worry about technical difficulties with our responsive support staff ready to help.</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="flex justify-center mt-12">
              <Link href="/packages">
                <Button size="lg" className="group">
                  Explore Membership Options
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA and Events Section */}
        <section className="w-full py-16 md:py-20 bg-muted/30 relative overflow-hidden">
          {/* Geometric patterns */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:14px_24px]"></div>

          {/* Abstract shapes */}
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/5 to-transparent"></div>
          <div className="absolute left-0 bottom-0 h-1/3 w-full bg-gradient-to-t from-primary/5 to-transparent"></div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-8 md:grid-cols-2">
              {/* Upcoming Events Calendar */}
              <div className="bg-background border rounded-xl p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <h3 className="text-2xl font-bold mb-4 relative z-10">Community Events Calendar</h3>
                <p className="text-muted-foreground mb-6 relative z-10">
                  Connect with professionals and expand your network at our exclusive events
                </p>
                <div className="relative z-10">
                  <UpcomingEvents />
                </div>
                <div className="mt-6 relative z-10">
                  <Link href="/events">
                    <Button variant="outline" className="w-full">
                      Browse All Events
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Membership CTA */}
              <div className="bg-primary text-primary-foreground rounded-xl p-6 md:p-8 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-foreground/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)]"></div>

                <h3 className="text-2xl font-bold mb-4 relative z-10">Become a Member Today</h3>
                <p className="mb-6 opacity-90 relative z-10">
                  Get exclusive access to premium meeting rooms, workspace benefits, and special member rates.
                </p>
                <ul className="space-y-3 mb-8 relative z-10">
                  <li className="flex items-center">
                    <Star className="h-5 w-5 mr-2 opacity-90" />
                    <span>Priority booking for meeting rooms</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 mr-2 opacity-90" />
                    <span>Discounted hourly rates</span>
                  </li>
                  <li className="flex items-center">
                    <Star className="h-5 w-5 mr-2 opacity-90" />
                    <span>Free monthly meeting credits</span>
                  </li>
                </ul>
                <div className="relative z-10">
                  <Link href="/packages">
                    <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                      Explore Membership Options
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">What Our Community Says</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                Hear from professionals who use our meeting spaces and workspace
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="overflow-hidden h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                      <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                      <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                      <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                      <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                    </div>
                    <blockquote className="mb-6 text-lg italic">"{testimonial.content}"</blockquote>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={testimonial.avatar || "/placeholder.svg"} />
                        <AvatarFallback>{testimonial.author.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{testimonial.author}</div>
                        <div className="text-muted-foreground text-sm">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
              <p className="text-muted-foreground mt-2">
                Find answers to common questions about our meeting rooms and workspace
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>{item.question}</AccordionTrigger>
                    <AccordionContent>{item.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <div className="mt-10 text-center">
              <p className="text-muted-foreground mb-4">Still have questions? We're here to help.</p>
              <Button variant="outline" className="mx-auto" onClick={() => setShowContactModal(true)}>
                Contact Support
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="w-full py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Book Your Perfect Meeting Space?</h2>
            <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
              Modern facilities, professional environment, flexible options.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/new">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Book a Room Now
                </Button>
              </Link>
              <Link href="/packages">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 w-full sm:w-auto"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Explore Membership
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Contact Modal */}
        <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Contact Information</DialogTitle>
              <DialogDescription>Get in touch with our support team for any questions or assistance.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">support@coworkingphuket.com</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">+66 76 123 456</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Business Hours</p>
                  <p className="text-sm text-muted-foreground">Monday - Friday: 8:00 AM - 8:00 PM</p>
                  <p className="text-sm text-muted-foreground">Saturday: 9:00 AM - 6:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">
                    123 Workspace Avenue, Patong Beach, Phuket 83150, Thailand
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowContactModal(false)}>
                Close
              </Button>
              
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <LocationMapModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
      </main>
    </div>
  )
}
