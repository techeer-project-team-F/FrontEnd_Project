import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { mockNotifications } from '@/mocks/data'
import type { NotificationType } from '@/types'
import BottomNav from '@/components/layout/BottomNav'

const typeIcon: Record<NotificationType, { icon: string; bg: string }> = {
  like: { icon: 'favorite', bg: 'bg-red-500' },
  comment: { icon: 'chat_bubble', bg: 'bg-blue-500' },
  follow: { icon: 'person_add', bg: 'bg-emerald-500' },
  new_review: { icon: 'menu_book', bg: 'bg-amber-600' },
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [notifications, setNotifications] = useState(mockNotifications)

  const displayed = activeTab === 'all' ? notifications : notifications.filter(n => !n.isRead)

  const unread = notifications.filter(n => !n.isRead)
  const read = notifications.filter(n => n.isRead)

  const markAsRead = (id: number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)))
  }

  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-primary">알림</h1>
          <div className="w-10" />
        </div>
        {/* Tabs */}
        <div className="flex gap-6 px-4">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'border-b-2 pb-2 text-sm font-bold transition-colors',
              activeTab === 'all'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            )}
          >
            전체
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={cn(
              'border-b-2 pb-2 text-sm font-medium transition-colors',
              activeTab === 'unread'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground'
            )}
          >
            읽지 않음
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'all' ? (
          <>
            {/* Unread Section */}
            {unread.length > 0 && (
              <div className="bg-primary/5 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest">New</p>
                {unread.map(noti => (
                  <NotificationItem
                    key={noti.id}
                    notification={noti}
                    onRead={markAsRead}
                    highlighted
                  />
                ))}
              </div>
            )}

            {/* Read Section */}
            {read.length > 0 && (
              <div className="px-4 py-3">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-widest">Earlier</p>
                {read.map(noti => (
                  <NotificationItem key={noti.id} notification={noti} onRead={markAsRead} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="px-4 py-3">
            {displayed.length > 0 ? (
              displayed.map(noti => (
                <NotificationItem
                  key={noti.id}
                  notification={noti}
                  onRead={markAsRead}
                  highlighted
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
                  notifications_off
                </span>
                <p className="text-sm text-muted-foreground">읽지 않은 알림이 없습니다</p>
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function NotificationItem({
  notification,
  onRead,
  highlighted = false,
}: {
  notification: (typeof mockNotifications)[number]
  onRead: (id: number) => void
  highlighted?: boolean
}) {
  const icon = typeIcon[notification.type]

  return (
    <button
      onClick={() => onRead(notification.id)}
      className={cn(
        'mb-3 flex w-full items-center gap-4 rounded-xl p-4 text-left transition-colors',
        highlighted ? 'bg-primary/10 shadow-sm' : 'hover:bg-primary/5'
      )}
    >
      <div className="relative shrink-0">
        <div className="size-12 overflow-hidden rounded-full border-2 border-card">
          {notification.senderProfileImageUrl ? (
            <img
              src={notification.senderProfileImageUrl}
              alt={notification.senderNickname}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-primary/10">
              <span className="material-symbols-outlined text-primary/40">person</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-card text-white',
            icon.bg
          )}
        >
          <span
            className={cn(
              'material-symbols-outlined text-[12px]',
              notification.type === 'like' && 'fill-icon'
            )}
          >
            {icon.icon}
          </span>
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm leading-snug">
          <span className="font-bold">{notification.senderNickname}</span>
          {notification.message}
          {notification.bookTitle && (
            <span className="italic"> &apos;{notification.bookTitle}&apos;</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{notification.createdAt}</p>
      </div>

      {!notification.isRead && <div className="size-2 shrink-0 rounded-full bg-primary" />}
    </button>
  )
}
