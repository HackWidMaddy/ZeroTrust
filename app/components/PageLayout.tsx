'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { User } from '../utils/auth';

interface PageLayoutProps {
  children: ReactNode;
  user: User;
  currentPage: string;
  onLogout: () => void;
}

export default function PageLayout({ children, user, currentPage, onLogout }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Left Sidebar */}
      <Sidebar user={user} currentPage={currentPage} onLogout={onLogout} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header Bar */}
        <Header />

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
