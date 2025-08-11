import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export function NotificationsPanel() {
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    select: (data) => data?.slice(0, 5) || [] // Show only latest 5
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-400';
      case 'medium': return 'bg-yellow-400';
      case 'low': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutter siden`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days} ${days === 1 ? 'dag' : 'dager'} siden`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Aktive varsler</h3>
      </CardHeader>
      <CardContent>
        {notifications?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-bell-slash text-4xl mb-4"></i>
            <p>Ingen nye varsler</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications?.map((notification) => (
              <div key={notification.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full mt-2 ${getPriorityColor(notification.priority)}`}></div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-xs text-gray-500">{notification.message}</p>
                  <p className="text-xs text-gray-400">{getTimeAgo(notification.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
