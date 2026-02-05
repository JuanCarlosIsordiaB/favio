import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, currentView, setCurrentView, selectedFirm, selectedPremise }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        selectedFirm={selectedFirm}
        selectedPremise={selectedPremise}
      />
      <div className="flex-1 ml-64">
        <Header />
        <main className="mt-16">
          {children}
        </main>
      </div>
    </div>
  );
}