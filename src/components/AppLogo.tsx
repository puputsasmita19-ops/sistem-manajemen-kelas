import React from 'react';
import { AppSettings } from '../types';
import {
  School,
  GraduationCap,
  BookOpen,
  Landmark,
  Award,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface AppLogoProps {
  settings?: AppSettings;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AppLogo: React.FC<AppLogoProps> = ({
  settings,
  className = '',
  size = 'md'
}) => {
  const currentSettings: AppSettings = settings || {
    appName: 'SIMAK',
    appDescription: 'Sistem Informasi Manajemen Kelas',
    logoType: 'icon',
    logoIcon: 'School',
    logoColor: 'blue',
    logoImageUrl: ''
  };

  const sizeMap = {
    sm: { container: 'w-8 h-8 rounded-lg', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6' },
    xl: { container: 'w-16 h-16 rounded-3xl', icon: 'w-8 h-8' }
  };

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-600 shadow-blue-500/25 text-white',
    indigo: 'bg-indigo-600 shadow-indigo-500/25 text-white',
    emerald: 'bg-emerald-600 shadow-emerald-500/25 text-white',
    purple: 'bg-purple-600 shadow-purple-500/25 text-white',
    amber: 'bg-amber-600 shadow-amber-500/25 text-white',
    rose: 'bg-rose-600 shadow-rose-500/25 text-white'
  };

  const { container, icon: iconSize } = sizeMap[size];
  const bgClass = colorMap[currentSettings.logoColor] || colorMap.blue;

  if (currentSettings.logoType === 'image' && currentSettings.logoImageUrl) {
    return (
      <div
        className={`${container} overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 shrink-0 ${className}`}
      >
        <img
          src={currentSettings.logoImageUrl}
          alt={currentSettings.appName}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback to School icon on image error
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  const renderIcon = () => {
    switch (currentSettings.logoIcon) {
      case 'GraduationCap':
        return <GraduationCap className={iconSize} />;
      case 'BookOpen':
        return <BookOpen className={iconSize} />;
      case 'Landmark':
        return <Landmark className={iconSize} />;
      case 'Award':
        return <Award className={iconSize} />;
      case 'Sparkles':
        return <Sparkles className={iconSize} />;
      case 'ShieldCheck':
        return <ShieldCheck className={iconSize} />;
      case 'School':
      default:
        return <School className={iconSize} />;
    }
  };

  return (
    <div
      className={`${container} ${bgClass} flex items-center justify-center font-black shadow-md shrink-0 transition-colors ${className}`}
    >
      {renderIcon()}
    </div>
  );
};
