export interface UserNotification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  link?: string
  is_read: boolean
  created_at: string
}

export interface AdminNotification {
  id: number
  title: string
  message: string
  type: string
  link?: string
  read: boolean
  created_at: string
}
