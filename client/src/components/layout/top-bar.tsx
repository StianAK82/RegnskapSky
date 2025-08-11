import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { user } = useAuth();
  const [showAIModal, setShowAIModal] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
            <i className="fas fa-bell text-lg"></i>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full"></span>
          </button>
          
          {/* AI Assistant Quick Access */}
          <Button 
            onClick={() => setShowAIModal(true)}
            className="bg-accent hover:bg-green-600 text-white"
          >
            <i className="fas fa-robot mr-2"></i>
            Spør AI
          </Button>

          {/* User Menu */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md">
              <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
              <i className="fas fa-chevron-down text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
