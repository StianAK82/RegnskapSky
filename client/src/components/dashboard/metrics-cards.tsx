import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardMetrics {
  totalClients: number;
  activeTasks: number;
  overdueTasks: number;
  weeklyHours: number;
  documentsProcessed: number;
}

export function MetricsCards() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['/api/dashboard/metrics'],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Totalt antall klienter',
      value: metrics?.totalClients || 0,
      icon: 'fas fa-users',
      color: 'blue',
      change: '+5.2%',
      changeText: 'fra forrige måned'
    },
    {
      title: 'Aktive oppgaver',
      value: metrics?.activeTasks || 0,
      icon: 'fas fa-tasks',
      color: 'yellow',
      change: metrics?.overdueTasks ? `${metrics.overdueTasks} forfalt` : '0 forfalt',
      changeText: '• 12 i dag'
    },
    {
      title: 'Timer ført (denne uke)',
      value: `${metrics?.weeklyHours || 0}`,
      icon: 'fas fa-clock',
      color: 'green',
      change: '+12.3%',
      changeText: 'fra forrige uke'
    },
    {
      title: 'Bilag behandlet',
      value: metrics?.documentsProcessed || 0,
      icon: 'fas fa-file-invoice',
      color: 'purple',
      change: 'AI: 89%',
      changeText: 'automatisk'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => (
        <Card key={index} className="bg-white shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getColorClasses(card.color)}`}>
                  <i className={card.icon}></i>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${card.color === 'yellow' && card.change.includes('forfalt') ? 'text-red-600' : 'text-green-600'}`}>
                {card.change}
              </span>
              <span className="text-gray-500 text-sm ml-1">{card.changeText}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
