import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { supabase } from './supabaseClient';

// --- 樓層顯示組件 ---
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

// --- 玩家端頁面 ---
const PlayerPage = () => {
  const [game, setGame] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [floorTimeLeft, setFloorTimeLeft] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('game_state').select('*').eq('id', 1).single();
      setGame(data);
    };
    init();

    const sub = supabase.channel('player_sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, p => setGame(p.new))
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (game?.is_running && game?.end_time) {
        setTimeLeft(Math.max(0, Math.floor((new Date(game.end_time) - new Date()) / 1000)));
      }
      if (game?.floor_is_running && game?.floor_end_time) {
        setFloorTimeLeft(Math.max(0, Math.floor((new Date(game.floor_end_time) - new Date()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [game]);

  if (!game) return <div className="p-10 text-center">連線中...</div>;

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="max-w-md mx-auto min-h-screen p-6 flex flex-col items-center">
      <h1 className={`text-3xl font-black mb-6 ${game.is_running ? 'text-indigo-400' : 'text-slate-500'}`}>
        {game.is_running ? "遊 戲 開 始 ！" : "遊 戲 結 束 ！"}
      </h1>

      {/* 時間區塊：並排顯示 */}
      <div className="grid grid-cols-2 gap-4 w-full mb-8 text-center">
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">遊戲時間尚餘</p>
          <div className="text-3xl font-mono font-bold text-white">{formatTime(timeLeft)}</div>
        </div>
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">樓層關閉尚餘</p>
          <div className="text-3xl font-mono font-bold text-indigo-400">{formatTime(floorTimeLeft)}</div>
        </div>
      </div>

      <div className="w-full flex flex-col-reverse rounded-xl overflow-hidden shadow-2xl mb-8">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(f => (
          <FloorItem key={f} floor={f} isActive={game.is_running && game.active_floors.includes(f)} />
        ))}
      </div>

      {/* 系統廣播區 */}
      <div className="w-full bg-indigo-900/30 border border-indigo-500/30 p-4 rounded-xl">
        <p className="text-indigo-400 text-xs font-bold uppercase mb-2">📢 系統廣播訊息</p>
        <div className="text-lg font-medium min-h-[1.5em]">
          {game.broadcast_msg || <span className="text-slate-600 italic">目前沒有新訊息</span>}
        </div>
      </div>
    </div>
  );
};

// --- 管理員頁面 ---
const AdminPage = () => {
  const [game, setGame] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [floorTimeLeft, setFloorTimeLeft] = useState(0);
  const [totalMins, setTotalMins] = useState(20); // 預設 20 分鐘
  const [floorMins, setFloorMins] = useState(5);  // 預設 5 分鐘
  const [msgInput, setMsgInput] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.from('game_state').select('*').eq('id', 1).single();
      setGame(data);
      if (data) setMsgInput(data.broadcast_msg || '');
    };
    init();
    const sub = supabase.channel('admin_sync').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_state' }, p => setGame(p.new)).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (game?.is_running && game?.end_time) {
        setTimeLeft(Math.max(0, Math.floor((new Date(game.end_time) - new Date()) / 1000)));
      }
      if (game?.floor_is_running && game?.floor_end_time) {
        setFloorTimeLeft(Math.max(0, Math.floor((new Date(game.floor_end_time) - new Date()) / 1000)));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [game]);

  // 替換 src/App.jsx 內的 update 函式
  const update = async (obj) => {
    console.log("嘗試更新數據:", obj);
    const { data, error } = await supabase
      .from('game_state')
      .update(obj)
      .eq('id', 1)
      .select();

    if (error) {
      console.error("Supabase 更新錯誤:", error.message);
      alert("更新失敗: " + error.message);
    } else {
      console.log("更新成功:", data);
    }
  };

  const toggleFloor = (f) => {
    const current = game.active_floors || [];
    const next = current.includes(f) ? current.filter(x => x !== f) : [...current, f];
    update({ active_floors: next });
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!game) return null;

  return (
    <div className="max-w-md mx-auto min-h-screen p-6 bg-slate-900 pb-20">
      <h1 className="text-center text-slate-500 font-mono mb-6">/ ADMIN_CONTROL</h1>
      
      {/* 時間顯示 */}
      <div className="grid grid-cols-2 gap-3 mb-6 text-center">
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
          <p className="text-slate-500 text-[10px] uppercase font-bold">總時間尚餘</p>
          <div className="text-2xl font-mono font-bold text-white">{formatTime(timeLeft)}</div>
        </div>
        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
          <p className="text-slate-500 text-[10px] uppercase font-bold">樓層時間尚餘</p>
          <div className="text-2xl font-mono font-bold text-indigo-400">{formatTime(floorTimeLeft)}</div>
        </div>
      </div>

      {/* 樓層控制 */}
      <div className="mb-6 grid grid-cols-5 gap-2">
        {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(f => (
          <button key={f} onClick={() => toggleFloor(f)} className={`h-10 rounded-lg font-bold border-2 ${game.active_floors.includes(f) ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
            {f === 0 ? "G" : f}
          </button>
        ))}
      </div>

      {/* 設定區 */}
      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">總遊戲時間</span>
          <div className="flex items-center gap-2">
            <input type="number" value={totalMins} onChange={e => setTotalMins(e.target.value)} className="bg-slate-900 w-14 text-center p-1 rounded border border-slate-600" />
            <span className="text-xs text-slate-500 text-indigo-400">min</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">樓層倒數時間</span>
          <div className="flex items-center gap-2">
            <input type="number" value={floorMins} onChange={e => setFloorMins(e.target.value)} className="bg-slate-900 w-14 text-center p-1 rounded border border-slate-600" />
            <span className="text-xs text-slate-500 text-indigo-400">min</span>
          </div>
        </div>

        <button onClick={() => update({ is_running: true, end_time: new Date(Date.now() + totalMins * 60000).toISOString(), floor_is_running: false })} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-600/30">
          遊戲開始 (啟動總倒數)
        </button>

        <button onClick={() => update({ floor_is_running: true, floor_end_time: new Date(Date.now() + floorMins * 60000).toISOString() })} className="w-full py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-200 transition-all">
          樓層倒數開始
        </button>

        <button onClick={() => update({ is_running: false, floor_is_running: false, active_floors: [], broadcast_msg: '' })} className="w-full py-2 bg-slate-700 text-white rounded-lg font-bold text-sm">
          重設遊戲
        </button>
      </div>

      {/* 廣播發送 */}
      <div className="mt-6 bg-slate-800 p-4 rounded-xl border border-slate-700">
        <p className="text-xs font-bold text-slate-500 uppercase mb-2">發送廣播訊息</p>
        <textarea value={msgInput} onChange={e => setMsgInput(e.target.value)} placeholder="例如：123樓即將關閉" className="w-full bg-slate-900 p-3 rounded-lg border border-slate-600 text-sm focus:outline-none focus:border-indigo-500 mb-3 h-20" />
        <button onClick={() => update({ broadcast_msg: msgInput })} className="w-full py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-500 transition-all">
          發送廣播
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