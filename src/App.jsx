import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';

// --- 專業版樓層組件 ---
const FloorItem = ({ floor, isActive }) => {
  const label = floor === 0 ? "G / F" : `${floor} / F`;
  return (
    <div className={`h-12 w-full flex items-center justify-center border-x-2 border-t-2 last:border-b-2 transition-all duration-500 font-semibold tracking-wider ${
      isActive ? 'floor-glow scale-[1.02] z-10' : 'floor-dim'
    }`}>
      {label}
    </div>
  );
};

// --- 玩家端頁面 (佈局依據草圖 1 & 2) ---
const PlayerPage = () => {
  const [game, setGame] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('game_state').select('*').eq('id', 1).single();
      setGame(data);
    };
    init();

    const sub = supabase.channel('player_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, 
        p => setGame(p.new))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    if (!game?.is_running || !game?.end_time) return setTimeLeft(0);
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(game.end_time) - new Date()) / 1000));
      setTimeLeft(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [game]);

  if (!game) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen p-8 flex flex-col items-center">
      {/* 頂端狀態 */}
      <h1 className={`text-3xl font-black mb-8 ${game.is_running ? 'text-indigo-400' : 'text-slate-500'}`}>
        {game.is_running ? "遊 戲 開 始 ！" : "遊 戲 結 束 ！"}
      </h1>

      {/* 時間區塊 */}
      <div className="text-center mb-10">
        <p className="text-slate-400 text-sm font-medium uppercase tracking-[0.2em] mb-2">遊戲時間尚餘</p>
        <div className="text-6xl font-mono font-bold text-white tabular-nums">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* 十層塔 */}
      <div className="w-full flex flex-col-reverse rounded-xl overflow-hidden shadow-2xl border-slate-700">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(f => (
          <FloorItem key={f} floor={f} isActive={game.is_running && game.active_floors.includes(f)} />
        ))}
      </div>
    </div>
  );
};

// --- 管理員頁面 (佈局依據草圖 3) ---
const AdminPage = () => {
  const [game, setGame] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inputMins, setInputMins] = useState(10);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('game_state').select('*').eq('id', 1).single();
      setGame(data);
    };
    init();
    const sub = supabase.channel('admin_sync').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, p => setGame(p.new)).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    if (!game?.is_running || !game?.end_time) return setTimeLeft(0);
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(game.end_time) - new Date()) / 1000));
      setTimeLeft(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [game]);

  const update = (obj) => supabase.from('game_state').update(obj).eq('id', 1);

  const toggleFloor = (f) => {
    const current = game.active_floors || [];
    const next = current.includes(f) ? current.filter(x => x !== f) : [...current, f];
    update({ active_floors: next });
  };

  if (!game) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen p-6 bg-slate-900">
      <h1 className="text-center text-slate-500 font-mono tracking-tighter mb-8 uppercase">/ admin_panel</h1>
      
      <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 mb-8 text-center shadow-xl">
        <div className="font-bold text-xl mb-1">{game.is_running ? "遊戲進行中" : "待機中"}</div>
        <div className="text-slate-400 text-xs mb-4 uppercase tracking-widest">遊戲時間尚餘</div>
        <div className="text-5xl font-mono font-bold text-indigo-400">
          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* 樓層矩陣 */}
      <div className="mb-8">
        <p className="text-slate-400 text-xs font-bold mb-4 uppercase ml-2">(on/off) 樓層控制</p>
        <div className="grid grid-cols-5 gap-3">
          {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(f => (
            <button
              key={f}
              onClick={() => toggleFloor(f)}
              className={`h-12 rounded-lg font-bold transition-all border-2 ${
                game.active_floors.includes(f) 
                ? 'bg-indigo-500 border-indigo-400 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              {f === 0 ? "G" : f}
            </button>
          ))}
        </div>
      </div>

      {/* 設置區 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
          <span className="font-bold">設定時間</span>
          <div className="flex items-center gap-2">
            <input 
              type="number" value={inputMins} onChange={e => setInputMins(e.target.value)}
              className="bg-slate-900 w-16 text-center p-2 rounded border border-slate-600 focus:border-indigo-500 outline-none font-mono"
            />
            <span className="text-sm text-slate-400">min</span>
          </div>
        </div>

        <button 
          onClick={() => update({ is_running: true, end_time: new Date(Date.now() + inputMins * 60000).toISOString() })}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          遊戲開始
        </button>

        <button 
          onClick={() => update({ is_running: false, active_floors: [] })}
          className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all active:scale-[0.98]"
        >
          重設遊戲
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}