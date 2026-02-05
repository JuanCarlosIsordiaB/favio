import React from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import NewDataMenu from './NewDataMenu';

export default function Header({ selectedFirmName = "Firma Seleccionada", selectedPremiseName = "Predio Seleccionado" }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-10">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 hover:bg-slate-100 rounded-full">
          <Menu size={20} className="text-slate-600" />
        </button>
        <div className="relative hidden md:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-green-500 outline-none w-64"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 hover:bg-slate-100 rounded-full transition-colors">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <NewDataMenu />
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-800">{selectedFirmName}</p>
          <p className="text-xs text-slate-500">{selectedPremiseName}</p>
        </div>
      </div>
    </header>
  );
}