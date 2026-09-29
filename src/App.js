import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://vxhkmjmrjzdsozfaggsu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4aGttam1yanpkc296ZmFnZ3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzOTY2MjgsImV4cCI6MjA5Mzk3MjYyOH0.e7ncLRc67n6i3AwA5btRrZ1TsYSqTH4Wh4F9es5Clww"
);

// ── バージョン番号 ────────────────────────────────────────────
// ページに大きな変更を加えるたびにカウントアップしてください（例: 1.0.1 → 1.0.2）
const APP_VERSION = "1.0.1";

// ── デフォルトテーマ定義 ──────────────────────────────────────
const DEFAULT_THEME = {
  bgApp:"#0f172a", bgSidebar:"#1e293b", bgCard:"#1e293b", bgInput:"#0f172a",
  bgTopbar:"#1e293b",
  textPrimary:"#f1f5f9", textSecondary:"#94a3b8", textMuted:"#475569",
  textLabel:"#64748b",
  accentBlue:"#3b82f6", accentPurple:"#8b5cf6", accentGreen:"#10b981",
  accentRed:"#ef4444", accentAmber:"#f59e0b",
  border:"#334155",
  fontXs:10, fontSm:11, fontBase:13, fontLg:15, fontXl:18, fontTitle:22,
};
const ThemeCtx = React.createContext(DEFAULT_THEME);
const useTheme = () => React.useContext(ThemeCtx);

// ── グローバルスタイル定数（ハードコード・App関数外）──────────
const S = {
  app:   { fontFamily:"'DM Sans',sans-serif", background:"#0f172a", minHeight:"100vh", color:"#f1f5f9", display:"flex" },
  side:  { width:210, background:"#1e293b", borderRight:"1px solid #334155", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:10 },
  main:  { marginLeft:210, flex:1, display:"flex", flexDirection:"column", minHeight:"100vh" },
  topbar:{ padding:"14px 24px", borderBottom:"1px solid #334155", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#1e293b", position:"sticky", top:0, zIndex:5 },
  card:  { background:"#1e293b", border:"1px solid #334155", borderRadius:12, padding:"14px 18px", marginBottom:10 },
  input: { width:"100%", background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"8px 12px", fontSize:13, color:"#f1f5f9", outline:"none" },
  label: { fontSize:11, color:"#64748b", marginBottom:4, display:"block", textTransform:"uppercase", letterSpacing:"0.6px" },
  btn:   { padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:600 },
  tag:   { fontSize:11, padding:"2px 8px", borderRadius:99, fontWeight:600, display:"inline-block" },
  modal: { position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" },
  mbox:  { background:"#1e293b", border:"1px solid #334155", borderRadius:16, padding:24, width:560, maxHeight:"88vh", overflowY:"auto" },
};

// ── ユーティリティ ──────────────────────────────────────────
const phaseColor = (p) => {
  if (!p) return "#475569";
  if (p.startsWith("P1")) return "#3b82f6";
  if (p.startsWith("P2")) return "#10b981";
  if (p.startsWith("P3")) return "#f59e0b";
  if (p.startsWith("P4")) return "#ef4444";
  if (p.startsWith("P5")) return "#8b5cf6";
  return "#475569";
};
const phaseShort = (p) => (!p ? "未着手" : p.replace(/^P\d:/, ""));
const prioColor  = (p) => p === "最重要" ? "#ef4444" : p === "重要" ? "#3b82f6" : "#64748b";
const prioBg     = (p) => p === "最重要" ? "#fef2f2" : p === "重要" ? "#eff6ff" : "#1e293b";
const pct        = (a, t) => (t > 0 ? Math.min(100, Math.round((a / t) * 100)) : 0);
const pctColor   = (p) => p >= 100 ? "#10b981" : p >= 70 ? "#f59e0b" : p > 0 ? "#3b82f6" : "#475569";

const PHASES   = ["P1:顧問連携・準備","P2:初回訪問・ヒアリング","P3:提案・商談","P4:クロージング・受注","P5:稼働・継続"];
const STATUSES = ["未着手","進行中","完了","保留","見送り"];
const PROBS    = ["A（受注）","B（高確度）","C（商談中）","D（初期接触）","E（見送り）"];
const ACT_TYPES = ["顧問からアポ取得","初回訪問（顧問同席）","ヒアリング実施","要件定義MTG","候補者提案","書類選考","面談実施","条件交渉","契約締結","稼働開始","フォローアップ","追加提案","その他"];
const HEARING_ITEMS = [
  { num:"①", title:"現在のリソース調達方法", prio:"★★★", questions:["現在どのようにエンジニアを確保しているか？","フリーランス活用の経験・抵抗感はあるか？","現状の調達先に不満はあるか？"] },
  { num:"②", title:"課題・不満・困りごと",   prio:"★★★", questions:["中期経営計画で最重要視している施策と課題は？","エンジニア採用で最も困っていることは？","プロジェクト遅延・スキル不足など具体的な問題は？"] },
  { num:"③", title:"理想・求めるエンジニア像",prio:"★★★", questions:["中期経営計画の重要施策を成功に導く人材ペルソナは？","必須スキル・経験・資格は？","人物面・コミュニケーション面での要件は？"] },
  { num:"④", title:"予算感・単価レンジ",      prio:"★★★", questions:["1名あたりの想定月額単価レンジは？","直接契約か商流介入OKか？","予算承認の決裁フローとタイムラインは？"] },
  { num:"⑤", title:"スケジュール・決裁フロー",prio:"★★★", questions:["いつ頃から稼働してほしいか？","意思決定に関わる人物は今日の面談相手だけか？","稼働後のレビュー・継続判断のタイミングは？"] },
];

// ── スタイル ────────────────────────────────────────────────

// ── 共通コンポーネント ───────────────────────────────────────
const Tag = ({ phase }) => (
  <span style={{ ...S.tag, background: phaseColor(phase) + "22", color: phaseColor(phase) }}>{phaseShort(phase)}</span>
);

const Spinner = () => (
  <div style={{ textAlign:"center", padding:40, color:"#475569" }}>読み込み中...</div>
);

const ProgBar = ({ act, tgt, color, h=5 }) => {
  const p = pct(act, tgt);
  const c = color || pctColor(p);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
        <span style={{ color:"#94a3b8" }}>{act} / {tgt}</span>
        <span style={{ color:c, fontWeight:700 }}>{p}%</span>
      </div>
      <div style={{ height:h, background:"#334155", borderRadius:99, overflow:"hidden" }}>
        <div style={{ width:`${p}%`, height:"100%", background:c, borderRadius:99, transition:"width 0.8s" }} />
      </div>
    </div>
  );
};

const FormField = ({ label, children }) => (
  <div>
    <label style={ S.label }>{label}</label>
    {children}
  </div>
);

const ModalWrap = ({ onClose, title, children, width=560 }) => (
  <div style={ S.modal } onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ ...S.mbox, width }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>{title}</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// ── ダッシュボード ───────────────────────────────────────────
const Dashboard = ({ companies, departments, engineers, logs, kpiTargets, onRefresh }) => {
  const kgiTarget  = kpiTargets.find(t=>t.kpi_name==="KGI目標")?.target || 60;
  const kgiCurrent = engineers.filter(e => e.status === "稼働中").length;
  const kgiPct     = pct(kgiCurrent, kgiTarget);
  const [sortedCos, setSortedCos] = useState([]);
  const [dragIdx,   setDragIdx]   = useState(null);

  useEffect(() => {
    setSortedCos([...companies].filter(c => c.is_active !== false).sort((a,b) => (a.sort_order||0)-(b.sort_order||0)));
  }, [companies]);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver  = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...sortedCos];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setSortedCos(next);
    setDragIdx(idx);
  };
  const handleDragEnd = async () => {
    setDragIdx(null);
    for (let i = 0; i < sortedCos.length; i++) {
      await supabase.from("companies").update({ sort_order: i }).eq("id", sortedCos[i].id);
    }
  };

  const coWithDepts = sortedCos.map(co => ({
    ...co,
    depts: departments.filter(d => d.company_id === co.id),
    latestLog: [...logs].filter(l => l.company === co.name).sort((a,b)=>b.date.localeCompare(a.date))[0] || null,
  }));

  return (
    <div>
      <div style={{ ...S.card, display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
        <div style={{ minWidth:120 }}>
          <div style={{ fontSize:10, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:4 }}>KGI進捗</div>
          <div style={{ fontSize:22, fontWeight:700 }}>
            {kgiCurrent} <span style={{ fontSize:13, color:"#64748b" }}>/ {kgiTarget}件</span>
          </div>
        </div>
        <div style={{ flex:1, height:10, background:"#334155", borderRadius:99, overflow:"hidden" }}>
          <div style={{ width:`${kgiPct}%`, height:"100%", background:"linear-gradient(90deg,#3b82f6,#8b5cf6)", borderRadius:99, transition:"width 1.2s ease" }} />
        </div>
        <div style={{ fontSize:26, fontWeight:800, color:"#818cf8", minWidth:60, textAlign:"right" }}>{kgiPct}%</div>
        <div style={{ fontSize:11, color:"#64748b", borderLeft:"1px solid #334155", paddingLeft:14, lineHeight:1.8 }}>
          残り <strong style={{ color:"#f1f5f9" }}>{kgiTarget - kgiCurrent}件</strong><br />期限 2027年3月末
        </div>
      </div>

      {/* 今日のアクション・期限超過 - 変数はuseEffectの外で計算 */}
      {(()=>{
        const _today = new Date().toISOString().slice(0,10);
        const _d7 = new Date(); _d7.setDate(_d7.getDate()+7);
        const _week = _d7.toISOString().slice(0,10);
        const _active = new Set(companies.filter(c=>c.is_active!==false).map(c=>c.name));
        const overdue = logs.filter(l=>
          l.next_action && l.next_action_date &&
          l.next_action_date !== "" &&
          l.status !== "完了" && l.status !== "見送り" &&
          _active.has(l.company) &&
          l.next_action_date < _today
        );
        const dueToday = logs.filter(l=>
          l.next_action && l.next_action_date &&
          l.next_action_date !== "" &&
          l.status !== "完了" && l.status !== "見送り" &&
          _active.has(l.company) &&
          l.next_action_date >= _today &&
          l.next_action_date <= _week
        );
        if (overdue.length === 0 && dueToday.length === 0) return null;
        return (
          <div style={{ marginBottom:16 }}>
            {/* 期限超過 */}
            {overdue.length > 0 && (
              <div style={{ background:"#450a0a", border:"1px solid #ef4444", borderRadius:12, padding:"12px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:16 }}>🚨</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#ef4444" }}>期限超過 {overdue.length}件 — 今すぐ対応が必要です</span>
                </div>
                {overdue.map(l => (
                  <div key={l.id} style={{ display:"flex", gap:10, padding:"9px 12px", background:"rgba(239,68,68,0.1)", borderRadius:8, marginBottom:6, alignItems:"center" }}>
                    <div style={{ minWidth:64, fontSize:11, color:"#ef4444", fontWeight:700 }}>
                      {l.next_action_date ? "期日: "+l.next_action_date.slice(5) : l.date?.slice(5)}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>{l.company?.replace("株式会社","").replace("合同会社","").trim()}</span>
                        {l.department && <span style={{ fontSize:11, color:"#94a3b8" }}>{l.department}</span>}
                        <Tag phase={l.phase} />
                      </div>
                      <div style={{ fontSize:13, color:"#fca5a5" }}>📌 {l.next_action}</div>
                    </div>
                    <button onClick={async()=>{
                      await supabase.from("activity_logs").update({ status:"完了" }).eq("id", l.id);
                      await supabase.from("activity_logs").insert([{
                        date: new Date().toISOString().slice(0,10),
                        company: l.company, department: l.department, person: l.person,
                        activity_type:"フォローアップ", phase: l.phase, status:"完了",
                        probability: l.probability,
                        memo:"✅ アクション完了：" + l.next_action,
                        next_action:"", next_action_date:null,
                      }]);
                      onRefresh();
                    }} style={{ padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:"#10b981", color:"#fff", whiteSpace:"nowrap", flexShrink:0 }}>
                      ✓ 完了
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 今日期限 */}
            {dueToday.length > 0 && (
              <div style={{ background:"#431407", border:"1px solid #f59e0b", borderRadius:12, padding:"12px 16px", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                  <span style={{ fontSize:16 }}>⏰</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#f59e0b" }}>期日まで1週間以内 {dueToday.length}件 — 早めに対応してください</span>
                </div>
                {dueToday.map(l => (
                  <div key={l.id} style={{ display:"flex", gap:10, padding:"9px 12px", background:"rgba(245,158,11,0.1)", borderRadius:8, marginBottom:6, alignItems:"center" }}>
                    <div style={{ minWidth:64, fontSize:11, color:"#f59e0b", fontWeight:700 }}>
                      {l.next_action_date ? "期日: "+l.next_action_date.slice(5) : ""}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                        <span style={{ fontSize:14, fontWeight:700, color:"#f1f5f9" }}>{l.company?.replace("株式会社","").replace("合同会社","").trim()}</span>
                        {l.department && <span style={{ fontSize:11, color:"#94a3b8" }}>{l.department}</span>}
                        <Tag phase={l.phase} />
                      </div>
                      <div style={{ fontSize:13, color:"#fcd34d" }}>📌 {l.next_action}</div>
                    </div>
                    <button onClick={async()=>{
                      await supabase.from("activity_logs").update({ status:"完了" }).eq("id", l.id);
                      await supabase.from("activity_logs").insert([{
                        date: new Date().toISOString().slice(0,10),
                        company: l.company, department: l.department, person: l.person,
                        activity_type:"フォローアップ", phase: l.phase, status:"完了",
                        probability: l.probability,
                        memo:"✅ アクション完了：" + l.next_action,
                        next_action:"", next_action_date:null,
                      }]);
                      onRefresh();
                    }} style={{ padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, background:"#10b981", color:"#fff", whiteSpace:"nowrap", flexShrink:0 }}>
                      ✓ 完了
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9" }}>企業別 稼働人数</div>
        <div style={{ fontSize:11, color:"#475569" }}>⠿ ドラッグで並び替え可能</div>
      </div>

      {coWithDepts.map((co, idx) => {
        const total = engineers.filter(e => e.status === "稼働中" && e.company_id === co.id).length;
        const ll    = co.latestLog;
        return (
          <div key={co.id} draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            style={{ ...S.card, cursor:"grab", opacity: dragIdx===idx ? 0.5 : 1, userSelect:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
              <span style={{ color:"#334155", fontSize:16 }}>⠿</span>
              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{co.name}</span>
              <span style={{ fontSize:18, fontWeight:700, color:"#818cf8" }}>{total}<span style={{ fontSize:11, color:"#64748b" }}>名</span></span>
            </div>

            {ll && (
              <div style={{
                padding:"14px 16px",
                background:"#1a2744",
                border:"1px solid #2d4a7a",
                borderRadius:10,
                marginBottom:10
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:15, fontWeight:700, color:"#94a3b8" }}>
                    {ll.date?.slice(5)}
                  </span>
                  <span style={{
                    fontSize:15, fontWeight:700,
                    padding:"2px 10px", borderRadius:99,
                    background: ll.phase?.startsWith("P5") ? "#f3e8ff" :
                                ll.phase?.startsWith("P4") ? "#fee2e2" :
                                ll.phase?.startsWith("P3") ? "#fef9c3" :
                                ll.phase?.startsWith("P2") ? "#dcfce7" : "#dbeafe",
                    color: ll.phase?.startsWith("P5") ? "#6b21a8" :
                           ll.phase?.startsWith("P4") ? "#991b1b" :
                           ll.phase?.startsWith("P3") ? "#854d0e" :
                           ll.phase?.startsWith("P2") ? "#166534" : "#1e40af",
                  }}>
                    {ll.phase?.replace(/^P\d:/,"")||"未着手"}
                  </span>
                  <span style={{ fontSize:16, fontWeight:700, color:"#f1f5f9" }}>
                    {ll.activity_type}
                  </span>
                  {ll.person && (
                    <span style={{ fontSize:14, color:"#94a3b8" }}>担当: {ll.person}</span>
                  )}
                </div>
                {ll.memo && (
                  <div style={{
                    fontSize:15, color:"#e2e8f0", lineHeight:1.8,
                    borderLeft:"3px solid #3b82f6",
                    paddingLeft:12, marginBottom:8
                  }}>
                    {ll.memo.slice(0,150)}{ll.memo.length>150?"...":""}
                  </div>
                )}
                {ll.next_action && (
                  <div style={{ fontSize:15, color:"#7dd3fc", fontWeight:600 }}>
                    📌 {ll.next_action}
                    {ll.next_action_date && (
                      <span style={{
                        marginLeft:10, fontSize:14,
                        color:"#94a3b8", fontWeight:400
                      }}>
                        期日: {ll.next_action_date.slice(5)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {co.depts.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {co.depts.map(d => {
                  const dCount = engineers.filter(e => e.status === "稼働中" && e.department_id === d.id).length;
                  return (
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0 5px 16px", borderTop:"1px solid #334155" }}>
                    <div style={{ width:3, height:14, borderRadius:2, background:"#334155" }} />
                    <span style={{ flex:1, fontSize:12, color:"#94a3b8" }}>{d.name}</span>
                    {d.start_month && <span style={{ fontSize:10, color:"#475569", background:"#334155", padding:"1px 6px", borderRadius:99 }}>{d.start_month}〜</span>}
                    <span style={{ fontSize:14, fontWeight:700, color: dCount>0?"#10b981":"#475569" }}>
                      {dCount}<span style={{ fontSize:10, color:"#64748b" }}>名</span>
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── KPI進捗 ─────────────────────────────────────────────────
const KpiView = ({ companies, departments, engineers, logs, projects, candidates, kpiTargets, editMode, setEditMode, onRefresh }) => {
  const QLABELS = ["Q1  2026年4〜6月","Q2  2026年7〜9月","Q3  2026年10〜12月","Q4  2027年1〜3月"];
  const QTHEMES = ["顧問連携確立・初回訪問","ヒアリング深化・提案開始","面談集中・クロージング加速","刈り取り・KGI達成"];
  const KPI_NAMES = ["稼働件数","面談実施数","候補提示数","顧問アポ数","案件数"];
  const DEFAULT_TGTS = {
    稼働件数:   [12,18,27,32],
    面談実施数: [34,51,77,91],
    候補提示数: [171,257,386,457],
    顧問アポ数: [3,9,9,9],
    案件数:     [5,10,15,20],
  };
  // kpiTargets から目標値を取得（なければデフォルト値）
  const getTgt = (qi, name) => {
    const found = kpiTargets.find(t => t.quarter === qi+1 && t.kpi_name === name);
    return found ? found.target : (DEFAULT_TGTS[name]?.[qi] || 0);
  };
  const [editingKpiTgt, setEditingKpiTgt] = useState(null); // editMode は props から受け取る
  const [editingKpiAct, setEditingKpiAct] = useState(null);
  const [kpiTgtVal, setKpiTgtVal] = useState("");
  const [kpiActVal, setKpiActVal] = useState("");
  const saveKpiTarget = async (qi, name, val) => {
    const existing = kpiTargets.find(t => t.quarter === qi+1 && t.kpi_name === name);
    if (existing) {
      await supabase.from("kpi_targets").update({ target: parseInt(val)||0 }).eq("id", existing.id);
    } else {
      await supabase.from("kpi_targets").insert([{ quarter:qi+1, kpi_name:name, target:parseInt(val)||0 }]);
    }
    setEditingKpiTgt(null);
    onRefresh();
  };

  // Q別期間定義
  const Q_RANGES = [
    { start:"2026-04-01", end:"2026-06-30" },
    { start:"2026-07-01", end:"2026-09-30" },
    { start:"2026-10-01", end:"2026-12-31" },
    { start:"2027-01-01", end:"2027-03-31" },
  ];

  const getActsByQ = (qi) => {
    const { start, end } = Q_RANGES[qi];
    const qLogs  = logs.filter(l => l.date >= start && l.date <= end);
    const qProjs = projects.filter(p => p.received_date >= start && p.received_date <= end);
    // 案件に紐づく候補者（推薦）・面談カウント
    const qProjIds = new Set(qProjs.map(p=>p.id));
    const qCands = candidates.filter(c => qProjIds.has(c.project_id));
    return {
      稼働件数:   engineers.filter(e => e.status === "稼働中").length,
      面談実施数: qCands.filter(c=>c.interviewed).length + qLogs.filter(l=>l.activity_type==="面談実施").length,
      候補提示数: qCands.filter(c=>c.recommended).length + qLogs.filter(l=>l.activity_type==="候補者提案").length,
      顧問アポ数: qLogs.filter(l=>l.activity_type==="顧問からアポ取得").length,
      案件数:     qProjs.length,
    };
  };

  const kgiTarget = kpiTargets.find(t=>t.kpi_name==="KGI目標")?.target || 60;
  const [editingKgi, setEditingKgi] = useState(false);
  const [kgiEditVal, setKgiEditVal] = useState("");
  const saveKgiTarget = async (val) => {
    const existing = kpiTargets.find(t=>t.kpi_name==="KGI目標");
    if (existing) {
      await supabase.from("kpi_targets").update({ target: parseInt(val)||60 }).eq("id", existing.id);
    } else {
      await supabase.from("kpi_targets").insert([{ quarter:0, kpi_name:"KGI目標", target:parseInt(val)||60 }]);
    }
    setEditingKgi(false);
    onRefresh();
  };
  const [editingTarget, setEditingTarget] = useState(null);
  const [targetForm, setTargetForm] = useState({});

  const startEditTarget = (co) => {
    setEditingTarget(co.id);
    setTargetForm({ q1:co.q1_target||0, q2:co.q2_target||0, q3:co.q3_target||0, q4:co.q4_target||0 });
  };

  const saveTarget = async (coId) => {
    await supabase.from("companies").update({
      q1_target: parseInt(targetForm.q1)||0,
      q2_target: parseInt(targetForm.q2)||0,
      q3_target: parseInt(targetForm.q3)||0,
      q4_target: parseInt(targetForm.q4)||0,
    }).eq("id", coId);
    setEditingTarget(null);
    onRefresh();
  };

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        {[0,1,2,3].map(qi => (
          <div key={qi} style={{ ...S.card, borderColor: qi===0?"#2563eb":"#334155" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <div style={{ background:qi===0?"#2563eb":"#334155", color:"#fff", borderRadius:8, padding:"4px 10px", fontSize:13, fontWeight:700 }}>{["Q1","Q2","Q3","Q4"][qi]}</div>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#f1f5f9" }}>{QLABELS[qi].slice(3)}</div>
                <div style={{ fontSize:11, color:"#64748b" }}>{QTHEMES[qi]}</div>
              </div>
              {qi===0 && <div style={{ marginLeft:"auto", fontSize:9, background:"#2563eb", color:"#fff", padding:"2px 8px", borderRadius:99, fontWeight:700 }}>進行中</div>}
            </div>
            {["稼働件数","面談実施数","候補提示数","顧問アポ数","案件数"].map(kname => {
              const autoVal  = getActsByQ(qi)[kname]||0;
              const manualRec = kpiTargets.find(t=>t.quarter===qi+1 && t.kpi_name===kname);
              const manualVal = manualRec?.actual;
              const a   = (manualVal !== null && manualVal !== undefined) ? manualVal : autoVal;
              const tgt = getTgt(qi, kname);
              const p   = pct(a, tgt);
              const isEdTgt = editingKpiTgt?.qi===qi && editingKpiTgt?.name===kname;
              const isEdAct = editingKpiAct?.qi===qi && editingKpiAct?.name===kname;
              const canManual = kname !== "稼働件数";

              const saveActual = async (val) => {
                const existing = kpiTargets.find(t=>t.quarter===qi+1 && t.kpi_name===kname);
                const numVal = val==="" ? null : parseInt(val)||0;
                if (existing) {
                  await supabase.from("kpi_targets").update({ actual: numVal }).eq("id", existing.id);
                } else {
                  await supabase.from("kpi_targets").insert([{ quarter:qi+1, kpi_name:kname, target:tgt, actual:numVal }]);
                }
                setEditingKpiAct(null);
                onRefresh();
              };

              return (
                <div key={kname} style={{ marginBottom:10, background:"#0f172a", borderRadius:7, padding:"7px 10px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                    <span style={{ color:"#94a3b8", fontSize:11 }}>{kname}</span>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>

                      {/* 実績値 */}
                      {isEdAct ? (
                        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <input type="number" min="0" value={kpiActVal}
                            onChange={e=>setKpiActVal(e.target.value)}
                            style={{ ...S.input, width:58, padding:"2px 5px", fontSize:11, textAlign:"center" }}
                            autoFocus onKeyDown={e=>{ if(e.key==="Enter") saveActual(kpiActVal); }} />
                          <button onClick={()=>saveActual(kpiActVal)}
                            style={{ ...S.btn, padding:"2px 6px", background:"#10b981", color:"#fff", fontSize:10 }}>保存</button>

                          <button onClick={()=>setEditingKpiAct(null)}
                            style={{ ...S.btn, padding:"2px 5px", background:"#334155", color:"#94a3b8", fontSize:10 }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <span style={{ fontWeight:700, color:pctColor(p), fontSize:12 }}>{a}</span>

                          {canManual && editMode ? (
                            <span onClick={()=>{ setEditingKpiAct({qi,name:kname}); setKpiActVal(String(a)); }}
                              style={{ cursor:"pointer", fontSize:11, opacity:0.7 }} title="実績値を編集">✏️</span>
                          ) : null}
                        </div>
                      )}

                      <span style={{ color:"#475569", fontSize:11 }}>/</span>

                      {/* 目標値 */}
                      {isEdTgt ? (
                        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <input type="number" min="0" value={kpiTgtVal}
                            onChange={e=>setKpiTgtVal(e.target.value)}
                            style={{ ...S.input, width:58, padding:"2px 5px", fontSize:11, textAlign:"center" }}
                            autoFocus onKeyDown={e=>e.key==="Enter"&&saveKpiTarget(qi,kname,kpiTgtVal)} />
                          <button onClick={()=>saveKpiTarget(qi,kname,kpiTgtVal)}
                            style={{ ...S.btn, padding:"2px 6px", background:"#2563eb", color:"#fff", fontSize:10 }}>保存</button>
                          <button onClick={()=>setEditingKpiTgt(null)}
                            style={{ ...S.btn, padding:"2px 5px", background:"#334155", color:"#94a3b8", fontSize:10 }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <span style={{ color:"#64748b", fontSize:12 }}>{tgt}</span>
                          {editMode ? <span onClick={()=>{ setEditingKpiTgt({qi,name:kname}); setKpiTgtVal(String(tgt)); }}
                            style={{ cursor:"pointer", fontSize:11, opacity:0.7 }} title="目標値を編集">✏️</span> : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ height:5, background:"#334155", borderRadius:99, overflow:"hidden" }}>
                    <div style={{ width:`${p}%`, height:"100%", background:pctColor(p), borderRadius:99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={ S.card }>
        <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:4 }}>企業別 稼働目標・実績</div>
        <div style={{ fontSize:11, color:"#475569", marginBottom:14 }}>✏️ 各行の「編集」ボタンでQ別目標数値を変更できます</div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:"1px solid #334155" }}>
                {["企業名","優先度","Q1","Q2","Q3","Q4","通期目標","稼働実績","案件数","達成率",""].map(h => (
                  <th key={h} style={{ padding:"7px 10px", color:"#64748b", fontWeight:600, textAlign:h==="企業名"?"left":"center", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map(co => {
                const act = engineers.filter(e => e.status === "稼働中" && e.company_id === co.id).length;
                const q1  = co.q1_target||0;
                const q2  = co.q2_target||0;
                const q3  = co.q3_target||0;
                const q4  = co.q4_target||0;
                const tgt = q1+q2+q3+q4;
                const p   = pct(act, tgt);
                const isEditing = editingTarget === co.id;
                return (
                  <tr key={co.id} style={{ borderBottom:"1px solid #1e293b" }}>
                    <td style={{ padding:"8px 10px", color:"#f1f5f9", fontSize:11 }}>{co.name.replace("株式会社","").replace("合同会社","").trim()}</td>
                    <td style={{ textAlign:"center", padding:"8px 10px" }}>
                      <span style={{ fontSize:10, padding:"2px 6px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
                    </td>
                    {isEditing ? (
                      ["q1","q2","q3","q4"].map(q => (
                        <td key={q} style={{ padding:"4px 6px" }}>
                          <input type="number" min="0" value={targetForm[q]}
                            onChange={e=>setTargetForm(f=>({...f,[q]:e.target.value}))}
                            style={{ ...S.input, width:52, padding:"4px 6px", fontSize:12, textAlign:"center" }} />
                        </td>
                      ))
                    ) : (
                      [q1,q2,q3,q4].map((v,i) => (
                        <td key={i} style={{ textAlign:"center", padding:"8px 10px" }}>
                          <div style={{ color:v>0?"#f1f5f9":"#475569", fontWeight:v>0?600:400 }}>{v||"─"}</div>
                          {i===0 && <div style={{ fontSize:9, color:"#10b981", marginTop:1 }}>{act}名実績</div>}
                        </td>
                      ))
                    )}
                    <td style={{ textAlign:"center", padding:"8px 10px", fontWeight:700, color:"#f1f5f9" }}>{tgt}</td>
                    <td style={{ textAlign:"center", padding:"8px 10px", color:"#10b981", fontWeight:700 }}>{act}</td>
                    <td style={{ textAlign:"center", padding:"8px 10px", color:"#818cf8", fontWeight:700 }}>
                      {projects.filter(p=>p.company_id===co.id).length}
                    </td>
                    <td style={{ padding:"8px 10px", minWidth:80 }}>
                      <div style={{ height:4, background:"#334155", borderRadius:99, overflow:"hidden" }}>
                        <div style={{ width:`${p}%`, height:"100%", background:p>=100?"#10b981":"#3b82f6", borderRadius:99 }} />
                      </div>
                      <div style={{ textAlign:"center", fontSize:9, color:"#64748b", marginTop:2 }}>{p}%</div>
                    </td>
                    <td style={{ padding:"6px 8px", textAlign:"center" }}>
                      {isEditing ? (
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>saveTarget(co.id)} style={{ ...S.btn, padding:"3px 8px", background:"#2563eb", color:"#fff", fontSize:10 }}>保存</button>
                          <button onClick={()=>setEditingTarget(null)} style={{ ...S.btn, padding:"3px 8px", background:"#334155", color:"#94a3b8", fontSize:10 }}>戻る</button>
                        </div>
                      ) : (
                        editMode ? <button onClick={()=>startEditTarget(co)} style={{ ...S.btn, padding:"3px 8px", background:"#334155", color:"#94a3b8", fontSize:10 }}>編集</button> : null
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ── 営業サマリー ────────────────────────────────────────────
const SummaryView = ({ companies, salesProcess, onUpdateProcess }) => {
  const [editSteps, setEditSteps] = useState(false);
  const [newStep, setNewStep]     = useState("");
  const [editingProcess, setEditingProcess] = useState(null);

  const DEFAULT_STEPS = ["顧問アポ","初回訪問","ヒアリング","要件定義","候補提示","面談"];

  const getStatus = (coId, step) => {
    const found = salesProcess.find(p => p.company_id === coId && p.step_name === step);
    return found ? found.status : "□";
  };

  const cycleStatus = async (coId, step) => {
    const found = salesProcess.find(p => p.company_id === coId && p.step_name === step);
    const next  = { "□":"▶", "▶":"✓", "✓":"□" };
    if (found) {
      await supabase.from("sales_process").update({ status: next[found.status] || "□" }).eq("id", found.id);
    } else {
      await supabase.from("sales_process").insert([{ company_id:coId, step_name:step, status:"▶" }]);
    }
    onUpdateProcess();
  };

  const allSteps = [...new Set([
    ...DEFAULT_STEPS,
    ...salesProcess.map(p => p.step_name)
  ])];

  const addStep = async () => {
    if (!newStep.trim()) return;
    for (const co of companies) {
      await supabase.from("sales_process").insert([{ company_id:co.id, step_name:newStep.trim(), status:"□" }]);
    }
    setNewStep("");
    onUpdateProcess();
  };

  const deleteStep = async (step) => {
    await supabase.from("sales_process").delete().eq("step_name", step);
    onUpdateProcess();
  };

  const statusStyle = (v) => ({
    width:22, height:22, borderRadius:5, cursor:"pointer",
    background: v==="✓"?"#10b981": v==="▶"?"#f59e0b":"#334155",
    color: v==="✓"||v==="▶"?"#fff":"#475569",
    display:"flex", alignItems:"center", justifyContent:"center",
    fontSize:11, fontWeight:700, margin:"0 auto", userSelect:"none",
  });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12, gap:8 }}>
        <button onClick={() => setEditSteps(!editSteps)}
          style={{ ...S.btn, background: editSteps?"#334155":"#2563eb", color:"#fff", fontSize:12 }}>
          {editSteps ? "編集終了" : "✏️ 項目を編集"}
        </button>
      </div>

      {editSteps && (
        <div style={{ ...S.card, marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:10 }}>営業プロセス項目の管理</div>
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input value={newStep} onChange={e=>setNewStep(e.target.value)} placeholder="新しい項目名" style={{ ...S.input, flex:1 }} />
            <button onClick={addStep} style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>追加</button>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {allSteps.map(step => (
              <div key={step} style={{ display:"flex", alignItems:"center", gap:4, background:"#334155", borderRadius:6, padding:"4px 10px" }}>
                <span style={{ fontSize:12, color:"#f1f5f9" }}>{step}</span>
                <button onClick={() => deleteStep(step)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #334155" }}>
              <th style={{ padding:"8px 12px", color:"#64748b", fontWeight:600, textAlign:"left", whiteSpace:"nowrap" }}>会社名</th>
              <th style={{ padding:"8px 12px", color:"#64748b", fontWeight:600, textAlign:"center" }}>優先度</th>
              {allSteps.map(s => (
                <th key={s} style={{ padding:"8px 10px", color:"#64748b", fontWeight:600, textAlign:"center", whiteSpace:"nowrap", fontSize:11 }}>{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map(co => (
              <tr key={co.id} style={{ borderBottom:"1px solid #1e293b" }}>
                <td style={{ padding:"8px 12px", color:"#f1f5f9", fontSize:12 }}>{co.name}</td>
                <td style={{ textAlign:"center", padding:"8px 10px" }}>
                  <span style={{ fontSize:10, padding:"2px 6px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
                </td>
                {allSteps.map(step => {
                  const v = getStatus(co.id, step);
                  return (
                    <td key={step} style={{ textAlign:"center", padding:"6px 10px" }}>
                      <div style={ statusStyle(v) } onClick={() => cycleStatus(co.id, step)}>
                        {v === "✓" ? "✓" : v === "▶" ? "▶" : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display:"flex", gap:16, marginTop:12, padding:"8px 12px", background:"#1e293b", borderRadius:8, fontSize:10, color:"#64748b" }}>
        {[["✓ 完了","#10b981"],["▶ 進行中","#f59e0b"],["□ 未","#334155"]].map(([l,c]) => (
          <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{ width:14, height:14, borderRadius:4, background:c }} /><span>{l}</span>
          </div>
        ))}
        <span style={{ marginLeft:8 }}>※ セルをクリックで状態を切り替えられます</span>
      </div>
    </div>
  );
};

// ── 活動ログ ────────────────────────────────────────────────
const LogView = ({ logs, companies, departments, loading }) => {
  const [expanded,     setExpanded]     = useState({});
  const [expandedDept, setExpandedDept] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");

  const grouped = {};
  logs.forEach(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return;
    const coName   = l.company    || "未設定";
    const deptName = l.department || "部署未設定";
    if (!grouped[coName]) grouped[coName] = {};
    if (!grouped[coName][deptName]) grouped[coName][deptName] = [];
    grouped[coName][deptName].push(l);
  });

  const totalCount = Object.values(grouped).reduce((s, dm) =>
    s + Object.values(dm).reduce((s2, ls) => s2 + ls.length, 0), 0);

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:14, alignItems:"flex-end" }}>
        <div style={{ minWidth:140 }}>
          <label style={S.label}>ステータス絞り込み</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={S.input}>
            <option value="all">全て</option>
            {["未着手","進行中","完了","保留","見送り"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ fontSize:12, color:"#64748b" }}>{totalCount}件</div>
      </div>

      {loading ? <Spinner /> : Object.entries(grouped).map(([coName, deptMap]) => {
        const isOpen  = expanded[coName] !== false;
        const coTotal = Object.values(deptMap).reduce((s, ls) => s + ls.length, 0);
        return (
          <div key={coName} style={{ marginBottom:12 }}>
            <div onClick={() => setExpanded(e => ({ ...e, [coName]: !isOpen }))}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#1e293b", border:"1px solid #334155", borderRadius: isOpen ? "10px 10px 0 0" : 10, cursor:"pointer" }}>
              <span style={{ fontSize:14 }}>{isOpen ? "▼" : "▶"}</span>
              <span style={{ flex:1, fontSize:14, fontWeight:700, color:"#f1f5f9" }}>🏢 {coName}</span>
              <span style={{ fontSize:12, color:"#64748b", background:"#334155", padding:"2px 10px", borderRadius:99 }}>{coTotal}件</span>
            </div>
            {isOpen && (
              <div style={{ border:"1px solid #334155", borderTop:"none", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                {Object.entries(deptMap).map(([deptName, deptLogs]) => {
                  const dkey      = coName + "_" + deptName;
                  const isDeptOpen = expandedDept[dkey] !== false;
                  return (
                    <div key={deptName} style={{ borderBottom:"1px solid #334155" }}>
                      <div onClick={() => setExpandedDept(e => ({ ...e, [dkey]: !isDeptOpen }))}
                        style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px 8px 28px", background:"#162032", cursor:"pointer" }}>
                        <span style={{ fontSize:12, color:"#64748b" }}>{isDeptOpen ? "▼" : "▶"}</span>
                        <span style={{ flex:1, fontSize:12, fontWeight:600, color:"#94a3b8" }}>└ {deptName}</span>
                        <span style={{ fontSize:11, color:"#475569" }}>{deptLogs.length}件</span>
                      </div>
                      {isDeptOpen && deptLogs.map(l => (
                        <div key={l.id} style={{ display:"flex", gap:14, padding:"10px 16px 10px 40px", borderTop:"1px solid #1e293b", background:"#0f172a" }}>
                          <div style={{ minWidth:50, fontSize:11, color:"#64748b", paddingTop:2 }}>{l.date?.slice(5)}</div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:"#cbd5e1", marginBottom:2 }}>
                              {l.activity_type}
                              {l.person && <span style={{ fontSize:11, color:"#64748b", marginLeft:8 }}>· {l.person}</span>}
                            </div>
                            {l.memo && <div style={{ fontSize:12, color:"#e2e8f0", lineHeight:1.6 }}>{l.memo}</div>}
                            {l.next_action && (
                              <div style={{ fontSize:11, color:"#7dd3fc", marginTop:3 }}>
                                📌 {l.next_action}
                                {l.next_action_date && <span style={{ color:"#64748b", marginLeft:6 }}>({l.next_action_date.slice(5)})</span>}
                              </div>
                            )}
                            <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
                              <Tag phase={l.phase} />
                              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, background:"#334155", color:"#94a3b8" }}>{l.status}</span>
                              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, background:"#334155", color:"#94a3b8" }}>{l.probability}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {totalCount === 0 && !loading && (
        <div style={{ textAlign:"center", padding:40, color:"#475569" }}>活動記録がありません</div>
      )}
    </div>
  );
};
// ── ヒアリングシート ────────────────────────────────────────
const HearingView = ({ companies, departments, keyPersons, hearingData, onSaveHearing, onSaveLog }) => {
  const [coId,    setCoId]    = useState(companies[0]?.id || "");
  const [answers, setAnswers] = useState({});
  const [checks,  setChecks]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [savedAsLog, setSavedAsLog] = useState(false);
  const [visitInfo, setVisitInfo] = useState({ date:"", person:"", partner:"", partner_kp:"", partner_dept:"" });

  useEffect(() => {
    if (!coId) return;
    const data = hearingData.filter(h => h.company_id === coId);
    const a = {}, c = {};
    data.forEach(h => { a[h.item_index] = h.answer||""; c[h.item_index] = h.is_completed||false; });
    setAnswers(a); setChecks(c);
  }, [coId, hearingData]);

  const co   = companies.find(c => c.id === coId);
  const depts = departments.filter(d => d.company_id === coId);
  const done  = Object.values(checks).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    await onSaveHearing(coId, answers, checks);
    setSaving(false);
  };

  const handleSaveAsLog = async () => {
    const memo = HEARING_ITEMS.map((item, idx) => {
      const ans = answers[idx];
      return ans ? `【${item.title}】${ans}` : "";
    }).filter(Boolean).join(" / ");
    await onSaveLog({
      company:       co?.name || "",
      department:    visitInfo.partner_dept,
      date:          visitInfo.date || new Date().toISOString().slice(0,10),
      person:        visitInfo.person,
      activity_type: "ヒアリング実施",
      phase:         "P2:初回訪問・ヒアリング",
      status:        "進行中",
      probability:   "D（初期接触）",
      memo:          `面談相手: ${visitInfo.partner}（${visitInfo.partner_dept}） / ${memo}`,
      next_action:   "",
    });
    setSavedAsLog(true);
    setTimeout(() => setSavedAsLog(false), 2000);
  };

  return (
    <div>
      <div style={{ ...S.card, display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200 }}>
          <label style={ S.label }>対象企業</label>
          <select value={coId} onChange={e => setCoId(e.target.value)} style={ S.input }>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          {co && <Tag phase={co.phase} />}
          <span style={{ fontSize:11, color:"#64748b" }}>{co?.unit_range}</span>
          <span style={{ fontSize:11, color: done>=4?"#10b981":"#64748b" }}>充足 {done}/{HEARING_ITEMS.length}</span>
        </div>
      </div>

      {/* 基本情報 */}
      <div style={{ ...S.card, marginBottom:14 }}>
        <div style={{ fontSize:12, fontWeight:600, color:"#f1f5f9", marginBottom:10 }}>基本情報</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          <FormField label="訪問日">
            <input type="date" value={visitInfo.date} onChange={e=>setVisitInfo(v=>({...v,date:e.target.value}))} style={ S.input } />
          </FormField>
          <FormField label="担当営業">
            <input value={visitInfo.person} onChange={e=>setVisitInfo(v=>({...v,person:e.target.value}))} style={ S.input } placeholder="担当営業" />
          </FormField>
          <FormField label="面談相手（キーマン）">
            <select value={visitInfo.partner_kp||""} onChange={e=>setVisitInfo(v=>({...v,partner_kp:e.target.value,partner:e.target.value}))} style={ S.input }>
              <option value="">（未選択 / 直接入力）</option>
              {keyPersons.filter(kp=>{
                const co = companies.find(c=>c.id===coId);
                return co && kp.company_id===co.id;
              }).map(kp=>(
                <option key={kp.id} value={kp.name}>{kp.name}{kp.title?" ("+kp.title+")":""}</option>
              ))}
            </select>
          </FormField>
          <FormField label="面談相手の部署">
            <input value={visitInfo.partner_dept} onChange={e=>setVisitInfo(v=>({...v,partner_dept:e.target.value}))} style={ S.input } placeholder="面談相手の部署" />
          </FormField>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        {HEARING_ITEMS.map((item, idx) => {
          const done = checks[idx];
          return (
            <div key={idx} style={{ ...S.card, borderLeft: done?"3px solid #10b981":"1px solid #334155", borderRadius:"0 12px 12px 0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:8 }}>
                <div style={{ width:22, height:22, borderRadius:6, background:"#2563eb", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0 }}>{item.num}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{item.title}</div>
                  <div style={{ fontSize:10, color:"#f59e0b" }}>{item.prio}</div>
                </div>
                <button onClick={() => setChecks(c => ({ ...c, [idx]:!c[idx] }))}
                  style={{ fontSize:10, padding:"3px 8px", borderRadius:99, border: done?"none":"1px solid #334155", background: done?"#10b981":"transparent", color: done?"#fff":"#64748b", cursor:"pointer", whiteSpace:"nowrap", fontWeight:600 }}>
                  {done ? "✓ 充足済" : "□ 未確認"}
                </button>
              </div>
              {item.questions.map((q, qi) => (
                <div key={qi} style={{ fontSize:11, color:"#475569", borderLeft:"2px solid #334155", paddingLeft:7, marginBottom:3 }}>• {q}</div>
              ))}
              <textarea value={answers[idx]||""} onChange={e=>setAnswers(a=>({...a,[idx]:e.target.value}))}
                placeholder="ヒアリング内容を記載..."
                style={{ ...S.input, resize:"vertical", minHeight:70, fontSize:12, marginTop:8 }} />
            </div>
          );
        })}
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
        <button onClick={handleSaveAsLog}
          style={{ ...S.btn, background: savedAsLog?"#10b981":"#334155", color:"#fff" }}>
          {savedAsLog ? "✓ 活動記録に保存済" : "活動記録として保存"}
        </button>
        <button onClick={handleSave}
          style={{ ...S.btn, background: saving?"#1d4ed8":"#2563eb", color:"#fff", minWidth:80 }}>
          {saving ? "保存中..." : "ヒアリング内容を保存"}
        </button>
      </div>
    </div>
  );
};

// ── 企業管理 ────────────────────────────────────────────────
const CompanyManager = ({ companies, departments, engineers, keyPersons, archivedCos, archivedDepts, onRefresh }) => {
  const [editCo,  setEditCo]  = useState(null);
  const [editDept,setEditDept]= useState(null);
  const [newCoForm, setNewCoForm] = useState({ name:"", priority:"重要", category:"", unit_range:"", note:"" });
  const [newDeptName, setNewDeptName] = useState("");
  const [expandedCo, setExpandedCo] = useState({});
  const [addingCo, setAddingCo] = useState(false);

  const saveCo = async (form) => {
    if (form.id) {
      await supabase.from("companies").update({ name:form.name, priority:form.priority, category:form.category, unit_range:form.unit_range, note:form.note }).eq("id", form.id);
    } else {
      await supabase.from("companies").insert([{ name:form.name, priority:form.priority, category:form.category, unit_range:form.unit_range, note:form.note }]);
    }
    setEditCo(null); setAddingCo(false); setNewCoForm({ name:"", priority:"重要", category:"", unit_range:"", note:"" });
    onRefresh();
  };

  const deleteCo = async (id) => {
    if (!window.confirm("この企業をアーカイブしますか？\n（アーカイブから復元・完全削除できます）")) return;
    await supabase.from("companies").update({ is_archived: true }).eq("id", id);
    onRefresh();
  };

  const addDept = async (coId) => {
    if (!newDeptName.trim()) return;
    await supabase.from("departments").insert([{ company_id:coId, name:newDeptName.trim(), active_count:0 }]);
    setNewDeptName(""); onRefresh();
  };

  const saveDept = async (dept) => {
    await supabase.from("departments").update({ name:dept.name, active_count:dept.active_count, start_month:dept.start_month||null }).eq("id", dept.id);
    setEditDept(null); onRefresh();
  };

  const deleteDept = async (id) => {
    if (!window.confirm("この部署をアーカイブしますか？")) return;
    await supabase.from("departments").update({ is_archived: true }).eq("id", id);
    onRefresh();
  };

  // ── キーマン管理 ─────────────────────────────────────────
  const [editKp,   setEditKp]   = useState(null);
  const [newKpForm, setNewKpForm] = useState({ name:"", title:"", email:"", phone:"", notes:"" });
  const [addingKp,  setAddingKp]  = useState(null); // company_id

  const saveKp = async (form) => {
    if (form.id) {
      await supabase.from("key_persons").update({
        name:form.name, title:form.title, email:form.email,
        phone:form.phone, notes:form.notes, department_id:form.department_id||null
      }).eq("id", form.id);
    } else {
      await supabase.from("key_persons").insert([{
        company_id:form.company_id, department_id:form.department_id||null,
        name:form.name, title:form.title, email:form.email,
        phone:form.phone, notes:form.notes
      }]);
    }
    setEditKp(null); setAddingKp(null);
    setNewKpForm({ name:"", title:"", email:"", phone:"", notes:"" });
    onRefresh();
  };

  const deleteKp = async (id) => {
    if (!window.confirm("このキーマンを削除しますか？")) return;
    await supabase.from("key_persons").delete().eq("id", id);
    onRefresh();
  };

  const KpForm = ({ initial, coId, depts, onSave, onCancel }) => {
    const [form, setForm] = useState({ ...initial, company_id:coId, department_id:"" });
    return (
      <div style={{ background:"#0f172a", borderRadius:8, padding:10, marginTop:6 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
          <div><label style={ S.label }>氏名</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={ S.input } placeholder="例: 田中 太郎" /></div>
          <div><label style={ S.label }>役職</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={ S.input } placeholder="例: 部長" /></div>
          <div><label style={ S.label }>部署</label>
            <select value={form.department_id||""} onChange={e=>setForm(f=>({...f,department_id:e.target.value}))} style={ S.input }>
              <option value="">（未選択）</option>
              {depts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label style={ S.label }>メール</label><input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={ S.input } placeholder="例: tanaka@example.com" /></div>
          <div><label style={ S.label }>電話</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={ S.input } placeholder="例: 03-xxxx-xxxx" /></div>
          <div><label style={ S.label }>メモ</label><input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={ S.input } placeholder="関係性・特記事項など" /></div>
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:6 }}>
          <button onClick={onCancel} style={{ ...S.btn, padding:"4px 10px", background:"#334155", color:"#94a3b8", fontSize:11 }}>キャンセル</button>
          <button onClick={()=>onSave(form)} style={{ ...S.btn, padding:"4px 10px", background:"#2563eb", color:"#fff", fontSize:11 }}>保存</button>
        </div>
      </div>
    );
  };

  const CoForm = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState(initial);
    return (
      <div style={{ ...S.card, borderColor:"#2563eb" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <FormField label="企業名">
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={ S.input } placeholder="企業名" />
          </FormField>
          <FormField label="優先度">
            <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={ S.input }>
              {["最重要","重要","通常"].map(p=><option key={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="カテゴリ">
            <input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={ S.input } placeholder="例: SI・クラウド" />
          </FormField>
          <FormField label="単価帯目安">
            <input value={form.unit_range} onChange={e=>setForm(f=>({...f,unit_range:e.target.value}))} style={ S.input } placeholder="例: 60〜90万円/月" />
          </FormField>
        </div>
        <FormField label="備考・戦略メモ">
          <textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{ ...S.input, minHeight:60, resize:"vertical" }} />
        </FormField>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:10 }}>
          <button onClick={onCancel} style={{ ...S.btn, background:"#334155", color:"#94a3b8" }}>キャンセル</button>
          <button onClick={()=>onSave(form)} style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>保存</button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
        <button onClick={()=>setAddingCo(true)} style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>＋ 企業を追加</button>
      </div>

      {addingCo && (
        <CoForm initial={newCoForm} onSave={saveCo} onCancel={()=>setAddingCo(false)} />
      )}

      {companies.map(co => {
        const coDepts = departments.filter(d => d.company_id === co.id);
        const isOpen  = expandedCo[co.id];
        return (
          <div key={co.id} style={{ ...S.card, opacity: co.is_active===false ? 0.6 : 1, borderColor: co.is_active===false?"#1e3a5f":undefined }}>
            {editCo?.id === co.id ? (
              <CoForm initial={editCo} onSave={saveCo} onCancel={()=>setEditCo(null)} />
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{co.name}</span>
                  {co.category && <span style={{ fontSize:11, color:"#64748b" }}>{co.category}</span>}
                  {co.unit_range && <span style={{ fontSize:11, color:"#475569" }}>{co.unit_range}</span>}
                  <button onClick={async()=>{
                    await supabase.from("companies").update({ is_active: co.is_active === false ? true : false }).eq("id", co.id);
                    onRefresh();
                  }} style={{ ...S.btn, padding:"4px 10px", background: co.is_active===false?"#365314":"#334155", color: co.is_active===false?"#86efac":"#94a3b8", fontSize:11 }}>
                    {co.is_active === false ? "▶ 再開" : "⏸ 保留"}
                  </button>
                  <button onClick={()=>setEditCo({...co})} style={{ ...S.btn, padding:"4px 10px", background:"#334155", color:"#94a3b8", fontSize:11 }}>編集</button>
                  <button onClick={()=>deleteCo(co.id)} style={{ ...S.btn, padding:"4px 10px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>削除</button>
                  <button onClick={()=>setExpandedCo(e=>({...e,[co.id]:!e[co.id]}))} style={{ background:"none", border:"none", color:"#64748b", cursor:"pointer", fontSize:14 }}>{isOpen?"▲":"▼"}</button>
                </div>

                {isOpen && (
                  <div style={{ marginTop:12, borderTop:"1px solid #334155", paddingTop:12 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#94a3b8", marginBottom:8 }}>部署一覧</div>
                    {coDepts.map(d => (
                      <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid #1e293b" }}>
                        {editDept?.id === d.id ? (
                          <>
                            <input value={editDept.name} onChange={e=>setEditDept(ed=>({...ed,name:e.target.value}))} style={{ ...S.input, flex:1, padding:"4px 8px", fontSize:12 }} />
                            <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                              <span style={{ fontSize:11, color:"#64748b" }}>開始月</span>
                              <input value={editDept.start_month||""} onChange={e=>setEditDept(ed=>({...ed,start_month:e.target.value}))} placeholder="例: 2026-04" style={{ ...S.input, width:90, padding:"4px 8px", fontSize:12 }} />
                            </div>
                            <button onClick={()=>saveDept(editDept)} style={{ ...S.btn, padding:"4px 10px", background:"#2563eb", color:"#fff", fontSize:11 }}>保存</button>
                            <button onClick={()=>setEditDept(null)} style={{ ...S.btn, padding:"4px 10px", background:"#334155", color:"#94a3b8", fontSize:11 }}>戻る</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex:1, fontSize:12, color:"#94a3b8" }}>{d.name}</span>
                            <span style={{ fontSize:14, fontWeight:700, color: engineers.filter(e=>e.status==="稼働中"&&e.department_id===d.id).length>0?"#10b981":"#475569" }}>{engineers.filter(e=>e.status==="稼働中"&&e.department_id===d.id).length}<span style={{ fontSize:10, color:"#64748b" }}>名</span></span>
                            <button onClick={()=>setEditDept({...d})} style={{ ...S.btn, padding:"3px 8px", background:"#334155", color:"#94a3b8", fontSize:11 }}>編集</button>
                            <button onClick={()=>deleteDept(d.id)} style={{ ...S.btn, padding:"3px 8px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>削除</button>
                          </>
                        )}
                      </div>
                    ))}
                    <div style={{ display:"flex", gap:8, marginTop:10 }}>
                      <input value={newDeptName} onChange={e=>setNewDeptName(e.target.value)} placeholder="新しい部署名" style={{ ...S.input, flex:1, fontSize:12 }} onKeyDown={e=>e.key==="Enter"&&addDept(co.id)} />
                      <button onClick={()=>addDept(co.id)} style={{ ...S.btn, background:"#2563eb", color:"#fff", fontSize:12 }}>追加</button>
                    </div>

                    {/* キーマン一覧 */}
                    <div style={{ marginTop:14, borderTop:"1px solid #334155", paddingTop:10 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#94a3b8" }}>👤 キーマン一覧</div>
                        <button onClick={()=>setAddingKp(co.id)} style={{ ...S.btn, padding:"3px 8px", background:"#2563eb", color:"#fff", fontSize:11 }}>＋ 追加</button>
                      </div>
                      {addingKp === co.id && (
                        <KpForm initial={newKpForm} coId={co.id} depts={coDepts}
                          onSave={saveKp} onCancel={()=>setAddingKp(null)} />
                      )}
                      {keyPersons.filter(kp=>kp.company_id===co.id).map(kp => {
                        const dept = departments.find(d=>d.id===kp.department_id);
                        return (
                          <div key={kp.id} style={{ padding:"7px 0", borderBottom:"1px solid #1e293b" }}>
                            {editKp?.id === kp.id ? (
                              <KpForm initial={editKp} coId={co.id} depts={coDepts}
                                onSave={saveKp} onCancel={()=>setEditKp(null)} />
                            ) : (
                              <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                                <div style={{ flex:1 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                    <span style={{ fontSize:12, fontWeight:600, color:"#f1f5f9" }}>{kp.name}</span>
                                    {kp.title && <span style={{ fontSize:10, color:"#64748b", background:"#334155", padding:"1px 6px", borderRadius:99 }}>{kp.title}</span>}
                                    {dept && <span style={{ fontSize:10, color:"#3b82f6" }}>{dept.name}</span>}
                                  </div>
                                  {(kp.email||kp.phone) && (
                                    <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>
                                      {kp.email && <span style={{ marginRight:10 }}>✉ {kp.email}</span>}
                                      {kp.phone && <span>📞 {kp.phone}</span>}
                                    </div>
                                  )}
                                  {kp.notes && <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{kp.notes}</div>}
                                </div>
                                <button onClick={()=>setEditKp({...kp})} style={{ ...S.btn, padding:"3px 8px", background:"#334155", color:"#94a3b8", fontSize:11 }}>編集</button>
                                <button onClick={()=>deleteKp(kp.id)} style={{ ...S.btn, padding:"3px 8px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>削除</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {keyPersons.filter(kp=>kp.company_id===co.id).length === 0 && !addingKp && (
                        <div style={{ fontSize:11, color:"#475569", textAlign:"center", padding:"8px 0" }}>キーマン未登録</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* アーカイブセクション */}
      {(archivedCos.length > 0 || archivedDepts.length > 0) && (
        <div style={{ marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"10px 14px", background:"#1a1a2e", border:"1px solid #334155", borderRadius:10 }}>
            <span style={{ fontSize:16 }}>🗑</span>
            <span style={{ fontSize:14, fontWeight:600, color:"#64748b" }}>アーカイブ</span>
            <span style={{ fontSize:11, color:"#475569", marginLeft:4 }}>— 誤削除した場合はここから復元できます</span>
          </div>

          {/* アーカイブ済み企業 */}
          {archivedCos.map(co => (
            <div key={co.id} style={{ ...S.card, opacity:0.7, borderColor:"#1e3a5f", marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, background:"#334155", color:"#475569" }}>アーカイブ</span>
                <span style={{ flex:1, fontSize:13, color:"#64748b" }}>{co.name}</span>
                <button onClick={async()=>{ await supabase.from("companies").update({is_archived:false}).eq("id",co.id); onRefresh(); }}
                  style={{ ...S.btn, padding:"4px 10px", background:"#1a3a1a", color:"#86efac", fontSize:11 }}>♻ 復元</button>
                <button onClick={async()=>{
                  if(!window.confirm("完全に削除します。この操作は取り消せません。")) return;
                  await supabase.from("companies").delete().eq("id",co.id);
                  onRefresh();
                }} style={{ ...S.btn, padding:"4px 10px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>🗑 完全削除</button>
              </div>
            </div>
          ))}

          {/* アーカイブ済み部署 */}
          {archivedDepts.map(d => {
            const co = companies.find(c=>c.id===d.company_id);
            return (
              <div key={d.id} style={{ ...S.card, opacity:0.7, borderColor:"#1e3a5f", marginBottom:6, paddingLeft:28 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, background:"#334155", color:"#475569" }}>部署アーカイブ</span>
                  <span style={{ flex:1, fontSize:12, color:"#64748b" }}>{co?.name} / {d.name}</span>
                  <button onClick={async()=>{ await supabase.from("departments").update({is_archived:false}).eq("id",d.id); onRefresh(); }}
                    style={{ ...S.btn, padding:"3px 8px", background:"#1a3a1a", color:"#86efac", fontSize:11 }}>♻ 復元</button>
                  <button onClick={async()=>{
                    if(!window.confirm("完全に削除します。この操作は取り消せません。")) return;
                    await supabase.from("departments").delete().eq("id",d.id);
                    onRefresh();
                  }} style={{ ...S.btn, padding:"3px 8px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>🗑 完全削除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 候補者管理コンポーネント ─────────────────────────────────
const CAND_STATUSES = ["推薦","面談","内定","稼働開始","見送り"];
const CAND_KEYS    = { "推薦":"recommended", "面談":"interviewed", "内定":"offered", "稼働開始":"started", "見送り":"passed" };
const CAND_COLORS  = { "推薦":"#3b82f6", "面談":"#f59e0b", "内定":"#10b981", "稼働開始":"#8b5cf6", "見送り":"#475569" };

const CandidateSection = ({ projectId, candidates, onRefresh }) => {
  const [newName, setNewName] = React.useState("");
  const [adding,  setAdding]  = React.useState(false);

  const projCands = candidates.filter(c => c.project_id === projectId);

  const counts = {};
  CAND_STATUSES.forEach(s => {
    counts[s] = projCands.filter(c => c[CAND_KEYS[s]]).length;
  });

  const addCandidate = async () => {
    if (!newName.trim()) return;
    await supabase.from("project_candidates").insert([{
      project_id: projectId, name: newName.trim(),
      recommended: true, interviewed: false,
      offered: false, started: false, passed: false,
    }]);
    setNewName("");
    setAdding(false);
    onRefresh();
  };

  const toggleStatus = async (cand, statusKey) => {
    if (statusKey === "passed") {
      await supabase.from("project_candidates").update({ passed: !cand.passed }).eq("id", cand.id);
      onRefresh();
      return;
    }
    if (statusKey === "recommended") return;
    const order = ["recommended","interviewed","offered","started"];
    const idx = order.indexOf(statusKey);
    const updates = {};
    if (!cand[statusKey]) {
      order.slice(0, idx+1).forEach(k => { updates[k] = true; });
    } else {
      order.slice(idx).forEach(k => { updates[k] = false; });
    }
    await supabase.from("project_candidates").update(updates).eq("id", cand.id);
    onRefresh();
  };

  const deleteCandidate = async (id) => {
    await supabase.from("project_candidates").delete().eq("id", id);
    onRefresh();
  };

  const inputStyle = {
    flex: 1,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 13,
    color: "#f1f5f9",
    outline: "none",
  };

  const btnStyle = (bg, color) => ({
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    background: bg,
    color: color,
  });

  const DATE_KEYS = { "推薦":"recommended_date", "面談":"interviewed_date", "内定":"offered_date", "稼働開始":"started_date", "見送り":"passed_date" };
  const [editDateId, setEditDateId] = React.useState(null); // {id, status}

  const saveDate = async (candId, statusKey, dateVal) => {
    const updateData = {};
    updateData[statusKey] = dateVal || null;
    await supabase.from("project_candidates").update(updateData).eq("id", candId);
    setEditDateId(null);
    onRefresh();
  };

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #334155", paddingTop: 12 }} onClick={e => e.stopPropagation()}>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        {CAND_STATUSES.map(s => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 99, background: CAND_COLORS[s] + "22", border: "1px solid " + CAND_COLORS[s] + "44" }}>
            <span style={{ fontSize: 11, color: CAND_COLORS[s], fontWeight: 600 }}>{s}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: CAND_COLORS[s] }}>{counts[s]}</span>
          </div>
        ))}
        <button
          onClick={e => { e.stopPropagation(); setAdding(true); }}
          style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "#2563eb", color: "#fff", marginLeft: "auto" }}
        >
          ＋ 候補者を追加
        </button>
      </div>

      {adding === true && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onClick={e => e.stopPropagation()}
            placeholder="推薦者名を入力"
            style={inputStyle}
            onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") addCandidate(); }}
            autoFocus
          />
          <button onClick={e => { e.stopPropagation(); addCandidate(); }} style={btnStyle("#2563eb", "#fff")}>追加</button>
          <button onClick={e => { e.stopPropagation(); setAdding(false); setNewName(""); }} style={btnStyle("#334155", "#94a3b8")}>キャンセル</button>
        </div>
      )}

      {projCands.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              <th style={{ padding: "5px 8px", color: "#64748b", textAlign: "left", fontWeight: 600 }}>推薦者名</th>
              {CAND_STATUSES.map(s => (
                <th key={s} style={{ padding: "5px 8px", color: CAND_COLORS[s], textAlign: "center", fontWeight: 600, whiteSpace: "nowrap" }}>{s}</th>
              ))}
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {projCands.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "7px 8px", color: "#f1f5f9", fontWeight: 600 }}>{c.name}</td>
                {CAND_STATUSES.map(s => {
                  const key     = CAND_KEYS[s];
                  const dateKey = DATE_KEYS[s];
                  const isOn    = c[key];
                  const fixed   = s === "推薦";
                  const dateVal = c[dateKey];
                  const isEditingDate = editDateId?.id === c.id && editDateId?.status === s;
                  return (
                    <td key={s} style={{ textAlign: "center", padding: "5px 6px", minWidth: 70 }}>
                      <div
                        onClick={() => { if (!fixed) toggleStatus(c, key); }}
                        style={{ width: 22, height: 22, borderRadius: 6, margin: "0 auto 3px", background: isOn ? CAND_COLORS[s] : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", cursor: fixed ? "default" : "pointer", fontWeight: 700, userSelect: "none" }}
                      >
                        {isOn ? "✓" : ""}
                      </div>
                      {isOn && (
                        isEditingDate ? (
                          <input
                            type="date"
                            defaultValue={dateVal || ""}
                            onClick={e => e.stopPropagation()}
                            onChange={e => saveDate(c.id, dateKey, e.target.value)}
                            onBlur={() => setEditDateId(null)}
                            autoFocus
                            style={{ width: 110, background: "#0f172a", border: "1px solid #334155", borderRadius: 4, padding: "2px 4px", fontSize: 10, color: "#f1f5f9", outline: "none" }}
                          />
                        ) : (
                          <div
                            onClick={e => { e.stopPropagation(); setEditDateId({ id: c.id, status: s }); }}
                            style={{ fontSize: 10, color: dateVal ? "#94a3b8" : "#475569", cursor: "pointer", textAlign: "center" }}
                            title="クリックで日付を入力"
                          >
                            {dateVal ? dateVal.slice(5) : "日付+"}
                          </div>
                        )
                      )}
                    </td>
                  );
                })}
                <td style={{ textAlign: "center", padding: "4px" }}>
                  <button onClick={() => deleteCandidate(c.id)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 14 }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {projCands.length === 0 && adding === false && (
        <div style={{ fontSize: 11, color: "#475569", textAlign: "center", padding: "8px 0" }}>候補者未登録</div>
      )}
    </div>
  );
};


// ── 案件管理 ─────────────────────────────────────────────────
const PROJECT_STATUSES = ["募集中","選考中","充足","クローズ"];
const WORK_STYLES = ["常駐（フルリモート）","常駐（ハイブリッド）","常駐（出社）","リモート可","要相談"];

const ProjectView = ({ companies, departments, projects, candidates, onRefresh }) => {
  const [filterCo,   setFilterCo]   = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterSt,   setFilterSt]   = useState("募集中");
  const [showForm,   setShowForm]   = useState(false);
  const [editProj,   setEditProj]   = useState(null);
  const [detailProj, setDetailProj] = useState(null);
  const emptyForm = {
    company_id:"", department_id:"", received_date:new Date().toISOString().slice(0,10),
    project_name:"", business_content:"", required_skills:"", preferred_skills:"",
    person_image:"", work_style:"", settlement_range:"", commercial_flow:"",
    unit_price:"", notes:"", status:"募集中"
  };
  const [form, setForm] = useState(emptyForm);

  const filterDepts = form.company_id ? departments.filter(d=>d.company_id===form.company_id) : [];
  const listDepts   = filterCo !== "all"
    ? departments.filter(d=>{ const co=companies.find(c=>c.name===filterCo); return co&&d.company_id===co.id; })
    : departments;

  const filtered = projects.filter(p => {
    if (filterCo !== "all") {
      const co = companies.find(c=>c.name===filterCo);
      if (!co || p.company_id !== co.id) return false;
    }
    if (filterDept !== "all") {
      const dept = departments.find(d=>d.name===filterDept);
      if (!dept || p.department_id !== dept.id) return false;
    }
    if (filterSt !== "all" && p.status !== filterSt) return false;
    return true;
  });

  const openForm = (proj=null) => {
    setForm(proj ? {...proj} : emptyForm);
    setEditProj(proj);
    setShowForm(true);
  };

  const saveProj = async () => {
    if (!form.project_name.trim()) { alert("案件名を入力してください"); return; }
    const data = {
      company_id:       form.company_id || null,
      department_id:    form.department_id || null,
      received_date:    form.received_date || null,
      project_name:     form.project_name,
      business_content: form.business_content,
      required_skills:  form.required_skills,
      preferred_skills: form.preferred_skills,
      person_image:     form.person_image,
      work_style:       form.work_style,
      settlement_range: form.settlement_range,
      commercial_flow:  form.commercial_flow,
      unit_price:       form.unit_price,
      notes:            form.notes,
      status:           form.status,
    };
    if (editProj) {
      await supabase.from("projects").update(data).eq("id", editProj.id);
    } else {
      await supabase.from("projects").insert([data]);
    }
    setShowForm(false);
    onRefresh();
  };

  const deleteProj = async (id) => {
    if (!window.confirm("この案件を削除しますか？")) return;
    await supabase.from("projects").delete().eq("id", id);
    onRefresh();
  };

  const stColor = (s) =>
    s==="募集中"?"#3b82f6": s==="選考中"?"#f59e0b": s==="充足"?"#10b981":"#475569";

  // 企業×部署ごとにグループ化
  const grouped = {};
  filtered.forEach(p => {
    const co   = companies.find(c=>c.id===p.company_id);
    const dept = departments.find(d=>d.id===p.department_id);
    const coKey = co?.name || "未設定";
    const deptKey = dept?.name || "未設定";
    if (!grouped[coKey]) grouped[coKey] = {};
    if (!grouped[coKey][deptKey]) grouped[coKey][deptKey] = [];
    grouped[coKey][deptKey].push(p);
  });

  return (
    <div>
      {/* サマリー */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"募集中",  val:projects.filter(p=>p.status==="募集中").length,  color:"#3b82f6" },
          { label:"選考中",  val:projects.filter(p=>p.status==="選考中").length,  color:"#f59e0b" },
          { label:"充足",    val:projects.filter(p=>p.status==="充足").length,    color:"#10b981" },
          { label:"総案件数",val:projects.length,                                  color:"#818cf8" },
        ].map(m=>(
          <div key={m.label} style={{ ...S.card, borderTop:`3px solid ${m.color}`, marginBottom:0 }}>
            <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:5 }}>{m.label}</div>
            <div style={{ fontSize:26, fontWeight:700, color:m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* フィルター＋追加ボタン */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={ S.label }>企業</label>
          <select value={filterCo} onChange={e=>{setFilterCo(e.target.value);setFilterDept("all");}} style={ S.input }>
            <option value="all">全企業</option>
            {companies.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={ S.label }>部署</label>
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} style={ S.input }>
            <option value="all">全部署</option>
            {listDepts.map(d=><option key={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ minWidth:120 }}>
          <label style={ S.label }>ステータス</label>
          <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={ S.input }>
            <option value="all">全て</option>
            {PROJECT_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={()=>openForm()} style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>＋ 案件を追加</button>
      </div>

      <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>{filtered.length}件</div>

      {/* 企業×部署グループ表示 */}
      {Object.entries(grouped).map(([coName, deptMap]) => (
        <div key={coName} style={{ marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", marginBottom:8, paddingBottom:6, borderBottom:"1px solid #334155" }}>
            🏢 {coName}
          </div>
          {Object.entries(deptMap).map(([deptName, projs]) => (
            <div key={deptName} style={{ marginBottom:14, paddingLeft:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#64748b", marginBottom:8 }}>
                └ {deptName}（{projs.length}件）
              </div>
              {projs.map(p => (
                <div key={p.id} style={{ ...S.card, marginBottom:8, cursor:"pointer" }}
                  onClick={()=>setDetailProj(detailProj?.id===p.id?null:p)}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:99, fontWeight:600, background:stColor(p.status)+"22", color:stColor(p.status) }}>{p.status}</span>
                    <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{p.project_name}</span>
                    {p.unit_price && <span style={{ fontSize:12, color:"#818cf8", fontWeight:700 }}>{p.unit_price}</span>}
                    {p.received_date && <span style={{ fontSize:11, color:"#475569" }}>{p.received_date.slice(5)}</span>}
                    <button onClick={e=>{e.stopPropagation();openForm(p);}}
                      style={{ ...S.btn, padding:"3px 8px", background:"#334155", color:"#94a3b8", fontSize:11 }}>編集</button>
                    <button onClick={e=>{e.stopPropagation();deleteProj(p.id);}}
                      style={{ ...S.btn, padding:"3px 8px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>削除</button>
                    <span style={{ color:"#475569", fontSize:12 }}>{detailProj?.id===p.id?"▲":"▼"}</span>
                  </div>

                  {detailProj?.id===p.id && (
                    <div style={{ marginTop:12, borderTop:"1px solid #334155", paddingTop:12 }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                        {[
                          { label:"案件受領日", val:p.received_date },
                          { label:"勤務形態",   val:p.work_style },
                          { label:"精算幅",     val:p.settlement_range },
                          { label:"商流",       val:p.commercial_flow },
                          { label:"単価",       val:p.unit_price },
                        ].map(({label,val})=> val ? (
                          <div key={label}>
                            <div style={{ fontSize:10, color:"#64748b", marginBottom:2, textTransform:"uppercase", letterSpacing:"0.6px" }}>{label}</div>
                            <div style={{ fontSize:13, color:"#f1f5f9" }}>{val}</div>
                          </div>
                        ) : null)}
                      </div>
                      {[
                        { label:"業務内容",     val:p.business_content },
                        { label:"必須要件",     val:p.required_skills },
                        { label:"歓迎要件",     val:p.preferred_skills },
                        { label:"求める人物像", val:p.person_image },
                        { label:"その他備考",   val:p.notes },
                      ].map(({label,val})=> val ? (
                        <div key={label} style={{ marginTop:10 }}>
                          <div style={{ fontSize:10, color:"#64748b", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.6px" }}>{label}</div>
                          <div style={{ fontSize:13, color:"#e2e8f0", lineHeight:1.7, borderLeft:"2px solid #334155", paddingLeft:10 }}>{val}</div>
                        </div>
                      ) : null)}

                      {/* 候補者管理セクション */}
                      <CandidateSection projectId={p.id} candidates={candidates} onRefresh={onRefresh} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
      {filtered.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:"#475569" }}>該当する案件がありません</div>
      )}

      {/* 登録・編集モーダル */}
      {showForm && (
        <div style={ S.modal } onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div style={{ ...S.mbox, width:640 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>{editProj?"案件を編集":"案件を追加"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={ S.label }>企業名</label>
                <select value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value,department_id:""}))} style={ S.input }>
                  <option value="">選択してください</option>
                  {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={ S.label }>部署名</label>
                <select value={form.department_id} onChange={e=>setForm(f=>({...f,department_id:e.target.value}))} style={ S.input }>
                  <option value="">（未選択）</option>
                  {filterDepts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={ S.label }>案件受領日</label>
                <input type="date" value={form.received_date} onChange={e=>setForm(f=>({...f,received_date:e.target.value}))} style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>ステータス</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={ S.input }>
                  {PROJECT_STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <label style={ S.label }>案件名 *</label>
                <input value={form.project_name} onChange={e=>setForm(f=>({...f,project_name:e.target.value}))} placeholder="例: Javaエンジニア募集（金融系基幹システム）" style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>勤務形態</label>
                <select value={form.work_style} onChange={e=>setForm(f=>({...f,work_style:e.target.value}))} style={ S.input }>
                  <option value="">選択</option>
                  {WORK_STYLES.map(w=><option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label style={ S.label }>単価</label>
                <input value={form.unit_price} onChange={e=>setForm(f=>({...f,unit_price:e.target.value}))} placeholder="例: 70〜85万円/月" style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>精算幅</label>
                <input value={form.settlement_range} onChange={e=>setForm(f=>({...f,settlement_range:e.target.value}))} placeholder="例: 140〜180h" style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>商流</label>
                <input value={form.commercial_flow} onChange={e=>setForm(f=>({...f,commercial_flow:e.target.value}))} placeholder="例: 直請け / 1社挟み" style={ S.input } />
              </div>
            </div>
            {[
              { key:"business_content", label:"業務内容",     ph:"担当する業務の詳細を記載..." },
              { key:"required_skills",  label:"必須要件",     ph:"必須スキル・経験・資格など..." },
              { key:"preferred_skills", label:"歓迎要件",     ph:"あれば尚可のスキル・経験..." },
              { key:"person_image",     label:"求める人物像", ph:"コミュニケーション・人物面の要件..." },
              { key:"notes",            label:"その他備考",   ph:"補足情報・注意事項など..." },
            ].map(f2=>(
              <div key={f2.key} style={{ marginTop:10 }}>
                <label style={ S.label }>{f2.label}</label>
                <textarea value={form[f2.key]} onChange={e=>setForm(f=>({...f,[f2.key]:e.target.value}))}
                  placeholder={f2.ph}
                  style={{ ...S.input, resize:"vertical", minHeight:70 }} />
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
              <button onClick={()=>setShowForm(false)} style={{ ...S.btn, background:"#334155", color:"#94a3b8" }}>キャンセル</button>
              <button onClick={saveProj} style={{ ...S.btn, background:"#2563eb", color:"#fff", minWidth:100 }}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 稼働者管理 ──────────────────────────────────────────────
const EngineerView = ({ companies, departments, engineers, archivedEngs, onRefresh }) => {
  const [filterCo,   setFilterCo]   = useState("all");
  const [filterSt,   setFilterSt]   = useState("稼働中");
  const [showForm,   setShowForm]   = useState(false);
  const [editEng,    setEditEng]    = useState(null);
  const [form, setForm] = useState({
    company_id:"", department_id:"", name:"", start_date:"",
    end_date:"", status:"稼働中", unit_price:"", contract_renewal_date:"", notes:""
  });

  const STATUSES_ENG = ["稼働中","契約更新中","契約終了","一時停止"];

  const filteredDepts = form.company_id
    ? departments.filter(d => d.company_id === form.company_id)
    : [];

  const filteredEngs = engineers.filter(e => {
    if (filterCo !== "all") {
      const co = companies.find(c => c.name === filterCo);
      if (!co || e.company_id !== co.id) return false;
    }
    if (filterSt !== "all" && e.status !== filterSt) return false;
    return true;
  });

  const activeCount  = engineers.filter(e => e.status === "稼働中").length;
  const renewalCount = engineers.filter(e => {
    if (e.status !== "稼働中" || !e.contract_renewal_date) return false;
    const today = new Date().toISOString().slice(0,10);
    const d30 = new Date(); d30.setDate(d30.getDate()+30);
    return e.contract_renewal_date <= d30.toISOString().slice(0,10);
  }).length;

  const openForm = (eng=null) => {
    if (eng) {
      setForm({ ...eng, unit_price: eng.unit_price||"" });
      setEditEng(eng);
    } else {
      setForm({ company_id:"", department_id:"", name:"", start_date:"",
        end_date:"", status:"稼働中", unit_price:"", contract_renewal_date:"", notes:"" });
      setEditEng(null);
    }
    setShowForm(true);
  };

  const saveEng = async () => {
    const data = {
      company_id:            form.company_id || null,
      department_id:         form.department_id || null,
      name:                  form.name,
      start_date:            form.start_date || null,
      end_date:              form.end_date || null,
      status:                form.status,
      unit_price:            parseInt(form.unit_price) || 0,
      contract_renewal_date: form.contract_renewal_date || null,
      notes:                 form.notes,
    };
    if (editEng) {
      await supabase.from("engineers").update(data).eq("id", editEng.id);
      // 稼働中の入り/抜け・部署異動に応じて、旧部署・新部署の稼働数を正しく増減させる
      const wasActive = editEng.status === "稼働中";
      const isActive  = data.status === "稼働中";
      const oldDeptId = editEng.department_id || null;
      const newDeptId = data.department_id || null;

      const decrementDept = async (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        if (dept && dept.active_count > 0) {
          await supabase.from("departments").update({ active_count: dept.active_count - 1 }).eq("id", dept.id);
        }
      };
      const incrementDept = async (deptId) => {
        const dept = departments.find(d => d.id === deptId);
        if (dept) {
          await supabase.from("departments").update({ active_count: (dept.active_count||0)+1 }).eq("id", dept.id);
        }
      };

      if (wasActive && !isActive) {
        // 稼働中 → 稼働中以外：旧部署から-1
        if (oldDeptId) await decrementDept(oldDeptId);
      } else if (!wasActive && isActive) {
        // 稼働中以外 → 稼働中：新部署に+1
        if (newDeptId) await incrementDept(newDeptId);
      } else if (wasActive && isActive && oldDeptId !== newDeptId) {
        // 稼働中のまま部署異動：旧部署-1・新部署+1
        if (oldDeptId) await decrementDept(oldDeptId);
        if (newDeptId) await incrementDept(newDeptId);
      }
    } else {
      await supabase.from("engineers").insert([data]);
      // 新規追加時に稼働中なら部署の稼働数+1
      if (data.status === "稼働中" && data.department_id) {
        const dept = departments.find(d => d.id === data.department_id);
        if (dept) {
          await supabase.from("departments").update({ active_count: (dept.active_count||0)+1 }).eq("id", dept.id);
        }
      }
    }
    setShowForm(false);
    onRefresh();
  };

  const deleteEng = async (eng) => {
    if (!window.confirm(`${eng.name}をアーカイブしますか？\n（アーカイブから復元・完全削除できます）`)) return;
    await supabase.from("engineers").update({ is_archived: true }).eq("id", eng.id);
    // 稼働中だった場合、部署の稼働数-1
    if (eng.status === "稼働中" && eng.department_id) {
      const dept = departments.find(d => d.id === eng.department_id);
      if (dept && dept.active_count > 0) {
        await supabase.from("departments").update({ active_count: dept.active_count - 1 }).eq("id", dept.id);
      }
    }
    onRefresh();
  };

  const statusColor = (s) =>
    s==="稼働中"?"#10b981": s==="契約更新中"?"#f59e0b": s==="契約終了"?"#475569":"#ef4444";

  const today = new Date().toISOString().slice(0,10);
  const d30 = new Date(); d30.setDate(d30.getDate()+30);
  const d30str = d30.toISOString().slice(0,10);

  return (
    <div>
      {/* サマリーカード */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
        {[
          { label:"稼働中",     val:activeCount,  color:"#10b981" },
          { label:"30日以内更新", val:renewalCount, color:"#f59e0b" },
          { label:"総登録数",   val:engineers.length, color:"#818cf8" },
        ].map(m => (
          <div key={m.label} style={{ ...S.card, borderTop:`3px solid ${m.color}`, marginBottom:0 }}>
            <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:5 }}>{m.label}</div>
            <div style={{ fontSize:26, fontWeight:700, color:m.color }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* 契約更新アラート */}
      {renewalCount > 0 && (
        <div style={{ background:"#431407", border:"1px solid #f59e0b", borderRadius:12, padding:"12px 16px", marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#f59e0b", marginBottom:8 }}>⚠️ 30日以内に契約更新が必要なエンジニア</div>
          {engineers.filter(e => e.status==="稼働中" && e.contract_renewal_date && e.contract_renewal_date <= d30str).map(e => {
            const co = companies.find(c => c.id === e.company_id);
            const dept = departments.find(d => d.id === e.department_id);
            return (
              <div key={e.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0", borderBottom:"1px solid rgba(245,158,11,0.2)" }}>
                <span style={{ fontSize:13, fontWeight:700, color:"#f1f5f9" }}>{e.name}</span>
                <span style={{ fontSize:11, color:"#94a3b8" }}>{co?.name?.replace("株式会社","").trim()}</span>
                {dept && <span style={{ fontSize:11, color:"#94a3b8" }}>{dept.name}</span>}
                <span style={{ marginLeft:"auto", fontSize:12, color:"#fcd34d", fontWeight:700 }}>更新日: {e.contract_renewal_date}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* フィルター＋追加ボタン */}
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={ S.label }>企業で絞り込み</label>
          <select value={filterCo} onChange={e=>setFilterCo(e.target.value)} style={ S.input }>
            <option value="all">全企業</option>
            {companies.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex:1, minWidth:140 }}>
          <label style={ S.label }>ステータス</label>
          <select value={filterSt} onChange={e=>setFilterSt(e.target.value)} style={ S.input }>
            <option value="all">全て</option>
            {STATUSES_ENG.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={()=>openForm()} style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>＋ 稼働者を追加</button>
      </div>

      <div style={{ fontSize:12, color:"#64748b", marginBottom:10 }}>{filteredEngs.length}名</div>

      {/* 一覧テーブル */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #334155" }}>
              {["名前","企業名","部署名","ステータス","稼働開始日","稼働終了日","単価（万円）","契約更新日","備考",""].map(h=>(
                <th key={h} style={{ padding:"8px 10px", color:"#64748b", fontWeight:600, textAlign:h==="名前"||h==="企業名"||h==="部署名"?"left":"center", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEngs.map(e => {
              const co   = companies.find(c=>c.id===e.company_id);
              const dept = departments.find(d=>d.id===e.department_id);
              const isRenewalSoon = e.contract_renewal_date && e.contract_renewal_date <= d30str && e.status==="稼働中";
              const isOverdue = e.contract_renewal_date && e.contract_renewal_date < today && e.status==="稼働中";
              return (
                <tr key={e.id} style={{ borderBottom:"1px solid #1e293b", background: isOverdue?"rgba(239,68,68,0.05)": isRenewalSoon?"rgba(245,158,11,0.05)":"transparent" }}>
                  <td style={{ padding:"10px 10px", color:"#f1f5f9", fontWeight:600 }}>{e.name}</td>
                  <td style={{ padding:"10px 10px", color:"#94a3b8", fontSize:11 }}>{co?.name?.replace("株式会社","").replace("合同会社","").trim()||"─"}</td>
                  <td style={{ padding:"10px 10px", color:"#94a3b8", fontSize:11 }}>{dept?.name||"─"}</td>
                  <td style={{ textAlign:"center", padding:"10px 10px" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:99, fontWeight:600, background:statusColor(e.status)+"22", color:statusColor(e.status) }}>{e.status}</span>
                  </td>
                  <td style={{ textAlign:"center", padding:"10px 10px", color:"#94a3b8" }}>{e.start_date||"─"}</td>
                  <td style={{ textAlign:"center", padding:"10px 10px", color:"#94a3b8" }}>{e.end_date||"─"}</td>
                  <td style={{ textAlign:"center", padding:"10px 10px", color: e.unit_price>0?"#f1f5f9":"#475569" }}>
                    {e.unit_price>0?e.unit_price+"万":"─"}
                  </td>
                  <td style={{ textAlign:"center", padding:"10px 10px", color: isOverdue?"#ef4444": isRenewalSoon?"#f59e0b":"#94a3b8", fontWeight: isRenewalSoon||isOverdue?700:400 }}>
                    {e.contract_renewal_date||"─"}
                    {isOverdue && " ⚠️"}
                  </td>
                  <td style={{ padding:"10px 10px", color:"#475569", fontSize:11, maxWidth:120 }}>{e.notes?.slice(0,30)||"─"}</td>
                  <td style={{ padding:"8px 10px", textAlign:"center", whiteSpace:"nowrap" }}>
                    <button onClick={()=>openForm(e)} style={{ ...S.btn, padding:"3px 8px", background:"#334155", color:"#94a3b8", fontSize:11, marginRight:4 }}>編集</button>
                    <button onClick={()=>deleteEng(e)} style={{ ...S.btn, padding:"3px 8px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>削除</button>
                  </td>
                </tr>
              );
            })}
            {filteredEngs.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign:"center", padding:30, color:"#475569" }}>該当する稼働者がいません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* アーカイブセクション */}
      {archivedEngs.length > 0 && (
        <div style={{ marginTop:24 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, padding:"10px 14px", background:"#1a1a2e", border:"1px solid #334155", borderRadius:10 }}>
            <span style={{ fontSize:16 }}>🗑</span>
            <span style={{ fontSize:14, fontWeight:600, color:"#64748b" }}>アーカイブ（{archivedEngs.length}名）</span>
            <span style={{ fontSize:11, color:"#475569", marginLeft:4 }}>— 誤削除した場合はここから復元できます</span>
          </div>
          {archivedEngs.map(e => {
            const co   = companies.find(c=>c.id===e.company_id);
            const dept = departments.find(d=>d.id===e.department_id);
            return (
              <div key={e.id} style={{ ...S.card, opacity:0.7, borderColor:"#1e3a5f", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, background:"#334155", color:"#475569" }}>アーカイブ</span>
                  <span style={{ fontSize:13, fontWeight:600, color:"#64748b" }}>{e.name}</span>
                  {co && <span style={{ fontSize:11, color:"#475569" }}>{co.name.replace("株式会社","").trim()}</span>}
                  {dept && <span style={{ fontSize:11, color:"#475569" }}>{dept.name}</span>}
                  <span style={{ marginLeft:"auto", fontSize:11, color:"#475569" }}>{e.start_date||"─"} 〜 {e.end_date||"現在"}</span>
                  <button onClick={async()=>{
                    await supabase.from("engineers").update({is_archived:false}).eq("id",e.id);
                    onRefresh();
                  }} style={{ ...S.btn, padding:"3px 8px", background:"#1a3a1a", color:"#86efac", fontSize:11 }}>♻ 復元</button>
                  <button onClick={async()=>{
                    if(!window.confirm("完全に削除します。この操作は取り消せません。")) return;
                    await supabase.from("engineers").delete().eq("id",e.id);
                    onRefresh();
                  }} style={{ ...S.btn, padding:"3px 8px", background:"#7f1d1d", color:"#fca5a5", fontSize:11 }}>🗑 完全削除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 追加・編集モーダル */}
      {showForm && (
        <div style={ S.modal } onClick={e=>e.target===e.currentTarget&&setShowForm(false)}>
          <div style={{ ...S.mbox, width:560 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9" }}>{editEng?"稼働者を編集":"稼働者を追加"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ gridColumn:"span 2" }}>
                <label style={ S.label }>名前 *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="例: 田中 太郎" style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>企業名</label>
                <select value={form.company_id} onChange={e=>setForm(f=>({...f,company_id:e.target.value,department_id:""}))} style={ S.input }>
                  <option value="">選択してください</option>
                  {companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={ S.label }>部署名</label>
                <select value={form.department_id} onChange={e=>setForm(f=>({...f,department_id:e.target.value}))} style={ S.input }>
                  <option value="">（未選択）</option>
                  {filteredDepts.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={ S.label }>ステータス</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={ S.input }>
                  {STATUSES_ENG.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={ S.label }>単価（万円）</label>
                <input type="number" min="0" value={form.unit_price} onChange={e=>setForm(f=>({...f,unit_price:e.target.value}))} placeholder="例: 75" style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>稼働開始日</label>
                <input type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))} style={ S.input } />
              </div>
              <div>
                <label style={ S.label }>稼働終了日</label>
                <input type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))} style={ S.input } />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <label style={ S.label }>契約更新日</label>
                <input type="date" value={form.contract_renewal_date} onChange={e=>setForm(f=>({...f,contract_renewal_date:e.target.value}))} style={ S.input } />
              </div>
              <div style={{ gridColumn:"span 2" }}>
                <label style={ S.label }>備考</label>
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="スキル・特記事項など" style={{ ...S.input, resize:"vertical", minHeight:60 }} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
              <button onClick={()=>setShowForm(false)} style={{ ...S.btn, background:"#334155", color:"#94a3b8" }}>キャンセル</button>
              <button onClick={saveEng} style={{ ...S.btn, background:"#2563eb", color:"#fff", minWidth:100 }}>保存する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── 月別アクション ──────────────────────────────────────────
const MONTHLY_ACTIONS_CSS = `
  :root {
    --bg: #0f1117;
    --surface: #1a1d2e;
    --surface2: #252840;
    --border: #2e3255;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --accent: #6366f1;
    --masuko: #10b981;
    --buka: #f59e0b;
    --q3: #6366f1;
    --q4: #ec4899;
    --progress: #10b981;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Noto Sans JP', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    padding: 24px 16px;
  }

  /* Edit mode toolbar */
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(15,17,23,0.95);
    border-bottom: 1px solid var(--border);
    padding: 10px 16px;
    margin: -24px -16px 24px;
    backdrop-filter: blur(8px);
    flex-wrap: wrap;
  }
  .toolbar-title { font-size: 13px; color: var(--text-muted); flex: 1; }
  .btn {
    padding: 7px 16px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .btn-edit {
    background: rgba(99,102,241,0.15);
    color: #818cf8;
    border: 1px solid rgba(99,102,241,0.3);
  }
  .btn-edit:hover { background: rgba(99,102,241,0.25); }
  .btn-edit.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
  .btn-save {
    background: rgba(16,185,129,0.15);
    color: #34d399;
    border: 1px solid rgba(16,185,129,0.3);
  }
  .btn-save:hover { background: rgba(16,185,129,0.25); }
  .btn-add {
    background: rgba(245,158,11,0.15);
    color: #fbbf24;
    border: 1px solid rgba(245,158,11,0.3);
    font-size: 11px;
    padding: 4px 10px;
  }
  .btn-add:hover { background: rgba(245,158,11,0.25); }
  .edit-hint {
    display: none;
    font-size: 11px;
    color: #818cf8;
    background: rgba(99,102,241,0.1);
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid rgba(99,102,241,0.2);
  }
  body.edit-mode .edit-hint { display: block; }

  /* Edit mode visual cues */
  body.edit-mode [contenteditable] {
    outline: 1px dashed rgba(99,102,241,0.4);
    border-radius: 4px;
    cursor: text;
    min-width: 20px;
    display: inline-block;
  }
  body.edit-mode [contenteditable]:focus {
    outline: 2px solid rgba(99,102,241,0.7);
    background: rgba(99,102,241,0.05);
  }
  body.edit-mode .action-list li {
    position: relative;
  }
  body.edit-mode .del-btn {
    display: inline-flex;
  }
  .del-btn {
    display: none;
    align-items: center;
    justify-content: center;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: rgba(239,68,68,0.2);
    color: #f87171;
    border: none;
    cursor: pointer;
    font-size: 10px;
    margin-left: 6px;
    vertical-align: middle;
    flex-shrink: 0;
    line-height: 1;
  }
  .del-btn:hover { background: rgba(239,68,68,0.4); }
  body.edit-mode .add-action-row { display: flex; }
  .add-action-row {
    display: none;
    gap: 6px;
    margin-top: 6px;
    align-items: center;
  }

  /* Header */
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }
  .header .subtitle { font-size: 13px; color: var(--text-muted); }

  /* KGI overview */
  .kgi-overview {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 28px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .kgi-main { flex: 1; min-width: 200px; }
  .kgi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .kgi-number { font-size: 28px; font-weight: 800; color: var(--progress); }
  .kgi-number span { font-size: 14px; font-weight: 400; color: var(--text-muted); }
  .kgi-bar { height: 6px; background: var(--border); border-radius: 3px; margin-top: 8px; overflow: hidden; }
  .kgi-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--progress), #34d399); }
  .kgi-stats { display: flex; gap: 16px; flex-wrap: wrap; }
  .kgi-stat { text-align: center; min-width: 80px; }
  .kgi-stat-value { font-size: 20px; font-weight: 700; }
  .kgi-stat-label { font-size: 11px; color: var(--text-muted); }
  .green { color: var(--progress); }
  .orange { color: var(--buka); }
  .purple { color: var(--accent); }
  .pink { color: #ec4899; }

  /* Legend */
  .legend { display: flex; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .dot-masuko { background: var(--masuko); }
  .dot-buka { background: var(--buka); }

  /* Quarter label */
  .quarter-label { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; margin-top: 4px; }
  .q-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; letter-spacing: 1px; }
  .q3-badge { background: rgba(99,102,241,0.2); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
  .q4-badge { background: rgba(236,72,153,0.2); color: #f472b6; border: 1px solid rgba(236,72,153,0.3); }
  .q-theme { font-size: 12px; color: var(--text-muted); }

  /* Month card */
  .month-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    user-select: none;
  }
  .month-header:hover { background: var(--surface2); }
  .month-left { display: flex; align-items: center; gap: 12px; }
  .month-icon { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  .q3-icon { background: rgba(99,102,241,0.15); }
  .q4-icon { background: rgba(236,72,153,0.15); }
  .month-title { font-size: 16px; font-weight: 700; }
  .month-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .month-right { display: flex; align-items: center; gap: 12px; }
  .month-target { text-align: right; }
  .month-target-num { font-size: 20px; font-weight: 800; }
  .month-target-label { font-size: 10px; color: var(--text-muted); }
  .chevron { font-size: 14px; color: var(--text-muted); transition: transform 0.2s; }
  .month-card.open .chevron { transform: rotate(180deg); }

  /* Progress mini */
  .month-progress { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-muted); }
  .prog-bar { width: 60px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--progress), #34d399); }

  /* Card body */
  .month-body { display: none; padding: 16px 18px; }
  .month-card.open .month-body { display: block; }

  /* KPI row */
  .kpi-row { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .kpi-chip {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 5px 10px;
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .kpi-chip .kpi-val { font-weight: 700; color: var(--text); }
  .kpi-chip .kpi-lbl { color: var(--text-muted); }

  /* Role sections */
  .role-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  @media (max-width: 500px) { .role-sections { grid-template-columns: 1fr; } }
  .role-card { border-radius: 10px; padding: 12px 14px; }
  .masuko-card { background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2); }
  .buka-card { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); }
  .role-header { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; }
  .role-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
  .masuko-avatar { background: rgba(16,185,129,0.2); color: var(--masuko); }
  .buka-avatar { background: rgba(245,158,11,0.2); color: var(--buka); }
  .role-name { font-size: 13px; font-weight: 700; }
  .role-title { font-size: 10px; color: var(--text-muted); }
  .action-list { list-style: none; }
  .action-list li {
    font-size: 12px;
    color: var(--text);
    padding: 4px 0;
    padding-left: 14px;
    position: relative;
    line-height: 1.5;
    display: flex;
    align-items: flex-start;
  }
  .action-list li::before {
    content: '▸';
    position: absolute;
    left: 0;
    font-size: 10px;
    top: 5px;
  }
  .masuko-card .action-list li::before { color: var(--masuko); }
  .buka-card .action-list li::before { color: var(--buka); }
  .li-text { flex: 1; }

  /* Focus companies */
  .focus-section { background: var(--surface2); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; }
  .focus-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .company-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .company-chip {
    font-size: 11px;
    padding: 3px 9px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .priority-最重要 { background: rgba(239,68,68,0.15); color: #fca5a5; border: 1px solid rgba(239,68,68,0.25); }
  .priority-重要 { background: rgba(245,158,11,0.15); color: #fcd34d; border: 1px solid rgba(245,158,11,0.25); }
  .priority-通常 { background: rgba(100,116,139,0.15); color: #94a3b8; border: 1px solid rgba(100,116,139,0.25); }
  .chip-target { font-size: 10px; opacity: 0.7; }

  /* Milestone */
  .milestone { background: rgba(99,102,241,0.08); border-left: 3px solid var(--accent); border-radius: 0 8px 8px 0; padding: 8px 12px; font-size: 12px; color: #a5b4fc; margin-top: 4px; }
  .milestone strong { color: #c7d2fe; display: block; font-size: 11px; margin-bottom: 2px; }

  /* Footer */
  .footer { text-align: center; font-size: 11px; color: var(--text-muted); margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }

  /* Notification dot */
  .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  /* Saved toast */
  .toast {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%) translateY(80px);
    background: #10b981;
    color: #fff;
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    transition: transform 0.3s;
    z-index: 200;
  }
  .toast.show { transform: translateX(-50%) translateY(0); }

  .bp-filter {
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 8px;
    padding: 5px 12px;
    font-size: 11px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .bp-filter:hover { background: var(--surface); }
  .bp-filter.active { background: var(--accent); color: #fff; border-color: var(--accent); }

`;

const MONTHLY_ACTIONS_BODY_HTML = `

<!-- Version 3: BP獲得アタックリスト追加 / 役職名編集対応 -->
<!-- Toolbar -->
<div class="toolbar">
  <span class="toolbar-title">🎯 下期 月別アクション通知</span>
  <span class="edit-hint">✏️ テキストをクリックして編集できます</span>
  <button class="btn btn-edit" id="editBtn" onclick="toggleEdit()">✏️ 編集モード</button>
  <button class="btn btn-save" onclick="saveHTML()">💾 HTMLで保存</button>
</div>

<div id="plan-content">
<div class="header">
  <h1>🎯 下期 月別アクション通知</h1>
  <div class="subtitle" contenteditable="false" data-key="k001">SIer二次請企業開拓 | 2026年10月〜2027年3月 | 益子チーム（2名体制）</div>
</div>

<!-- KGI Overview -->
<div class="kgi-overview">
  <div class="kgi-main">
    <div class="kgi-label">KGI 稼働件数</div>
    <div class="kgi-number"><span id="kgiTargetVal" contenteditable="false" data-key="k002">90</span> <span>名（改訂目標）</span></div>
    <div id="kgiSubtitle" style="font-size:11px; color:var(--text-muted); margin-top:4px;">現在 24名 → 下期で +66名 追加が必要</div>
    <div class="kgi-bar" style="margin-top:10px;"><div class="kgi-bar-fill" id="kgiBarFill" style="width:27%"></div></div>
    <div id="kgiPercentText" style="font-size:10px; color:var(--text-muted); margin-top:4px;">27% 達成（2026年9月末時点）</div>
  </div>
  <div class="kgi-stats">
    <div class="kgi-stat"><div class="kgi-stat-value green" id="statCurrent">24</div><div class="kgi-stat-label">現在稼働</div></div>
    <div class="kgi-stat"><div class="kgi-stat-value orange" id="statRemain">66</div><div class="kgi-stat-label">残り目標</div></div>
    <div class="kgi-stat"><div class="kgi-stat-value purple" id="statAvg">11</div><div class="kgi-stat-label">月平均必要</div></div>
    <div class="kgi-stat"><div class="kgi-stat-value pink" contenteditable="false" data-key="k003">2</div><div class="kgi-stat-label">チーム人数</div></div>
  </div>
</div>

<div class="legend">
  <div class="legend-item"><div class="legend-dot dot-masuko"></div><span contenteditable="false" data-key="k004">益子（マネージャー）</span></div>
  <div class="legend-item"><div class="legend-dot dot-buka"></div><span contenteditable="false" data-key="k005">部下（担当）</span></div>
</div>

<!-- Q3 Label -->
<div class="quarter-label">
  <span class="q-badge q3-badge">Q3</span>
  <span class="q-theme" contenteditable="false" data-key="k006">2026年10〜12月 ／ 面談集中・クロージング加速</span>
</div>

<!-- October 2026 -->
<div class="month-card open" id="card-oct">
  <div class="month-header" onclick="handleHeaderClick(event,'card-oct')">
    <div class="month-left">
      <div class="month-icon q3-icon">🍂</div>
      <div>
        <div class="month-title">2026年10月</div>
        <div class="month-sub" contenteditable="false" data-key="k007">Q3スタート ／ 下期始動月</div>
      </div>
    </div>
    <div class="month-right">
      <div class="month-target">
        <div class="month-target-num" style="color:#818cf8" contenteditable="false" data-key="k008">35名</div>
        <div class="month-target-label">月末累計目標</div>
      </div>
      <div class="month-progress">
        <div class="prog-bar"><div class="prog-fill" style="width:39%"></div></div>
        <span contenteditable="false" data-key="k009">39%</span>
      </div>
      <div class="chevron">▼</div>
    </div>
  </div>
  <div class="month-body">
    <div class="kpi-row">
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k010">+11名</span><span class="kpi-lbl">今月新規目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k011">25回</span><span class="kpi-lbl">面談実施目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k012">130件</span><span class="kpi-lbl">候補提示目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k013">27件</span><span class="kpi-lbl">案件数目標</span></div>
    </div>
    <div class="role-sections">
      <div class="role-card masuko-card">
        <div class="role-header">
          <div class="role-avatar masuko-avatar">益</div>
          <div><div class="role-name" contenteditable="false" data-key="k014">益子</div><div class="role-title" contenteditable="false" data-key="k015">マネージャー ／ 最重要企業担当</div></div>
        </div>
        <ul class="action-list" id="oct-masuko">
          <li><span class="li-text" contenteditable="false" data-key="k016">部下に担当企業を正式割り当て・OJT開始（週1回1on1設定）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k017">BREXAへ10月面談枠10名分を確保。フリーランスサービス部中心にクロージング</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k018">eSOL BPパートナー経由で新規案件5件取り込み（9/2懇親会フォロー）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k019">NTTドコモビジネス 9/16 MTG後の次回提案日程確定・候補者2名リスト化</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k020">下期KPI進捗を週次でダッシュボード確認・部下に共有</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('oct-masuko')">＋ 行動を追加</button></div>
      </div>
      <div class="role-card buka-card">
        <div class="role-header">
          <div class="role-avatar buka-avatar">部</div>
          <div><div class="role-name" contenteditable="false" data-key="k021">部下</div><div class="role-title" contenteditable="false" data-key="k022">担当 ／ 重要企業実行</div></div>
        </div>
        <ul class="action-list" id="oct-buka">
          <li><span class="li-text" contenteditable="false" data-key="k023">担当企業（NTTデータ・ウィズ・クロスリスティング・NTTテクノクロス）の現状把握ヒアリング</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k024">クロスリスティング：派遣契約OK確認済→候補者2名選定・提案資料作成</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k025">NTTデータ・ウィズ：Q2遅延分のリカバリ候補者3名ピックアップ</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k026">NTTドコモビジネスX・NTTデータNJK：担当者連絡・10月訪問アポ取得</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k027">週次で益子に進捗報告（月曜朝10分）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('oct-buka')">＋ 行動を追加</button></div>
      </div>
    </div>
          </div>
    <div class="milestone">
      <strong>📌 月末チェックポイント</strong>
      <span contenteditable="false" data-key="k028">累計35名達成 ／ 部下が担当企業の初訪問を全社完了 ／ BREXA・eSOLの面談パイプライン確立</span>
    </div>
  </div>
</div>

<!-- November 2026 -->
<div class="month-card" id="card-nov">
  <div class="month-header" onclick="handleHeaderClick(event,'card-nov')">
    <div class="month-left">
      <div class="month-icon q3-icon">🌿</div>
      <div>
        <div class="month-title">2026年11月</div>
        <div class="month-sub" contenteditable="false" data-key="k029">Q3中盤 ／ 面談ピーク月</div>
      </div>
    </div>
    <div class="month-right">
      <div class="month-target">
        <div class="month-target-num" style="color:#818cf8" contenteditable="false" data-key="k030">46名</div>
        <div class="month-target-label">月末累計目標</div>
      </div>
      <div class="month-progress">
        <div class="prog-bar"><div class="prog-fill" style="width:51%"></div></div>
        <span contenteditable="false" data-key="k031">51%</span>
      </div>
      <div class="chevron">▼</div>
    </div>
  </div>
  <div class="month-body">
    <div class="kpi-row">
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k032">+11名</span><span class="kpi-lbl">今月新規目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k033">26回</span><span class="kpi-lbl">面談実施目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k034">130件</span><span class="kpi-lbl">候補提示目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k035">27件</span><span class="kpi-lbl">案件数目標</span></div>
    </div>
    <div class="role-sections">
      <div class="role-card masuko-card">
        <div class="role-header">
          <div class="role-avatar masuko-avatar">益</div>
          <div><div class="role-name" contenteditable="false" data-key="k036">益子</div><div class="role-title" contenteditable="false" data-key="k037">マネージャー ／ 最重要企業担当</div></div>
        </div>
        <ul class="action-list" id="nov-masuko">
          <li><span class="li-text" contenteditable="false" data-key="k038">BREXAへ追加DXコンサルティング部・AIソリューション推進部への新規提案開始</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k039">eSOL BP経由で獲得した案件の候補者マッチング・面談実施（目標4名着手）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k040">NTTドコモビジネス：デジタル改革推進部への候補者2名提案。法人DXソリューション部も並行探索</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k041">スリーシェイク・AGEST等 既存稼働企業への追加案件ヒアリング</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k042">部下の中間進捗レビュー → 遅延企業があれば担当交代or支援を判断</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('nov-masuko')">＋ 行動を追加</button></div>
      </div>
      <div class="role-card buka-card">
        <div class="role-header">
          <div class="role-avatar buka-avatar">部</div>
          <div><div class="role-name" contenteditable="false" data-key="k043">部下</div><div class="role-title" contenteditable="false" data-key="k044">担当 ／ 重要企業実行</div></div>
        </div>
        <ul class="action-list" id="nov-buka">
          <li><span class="li-text" contenteditable="false" data-key="k045">クロスリスティング：ADマネジメント本部・プロダクト開発部へ候補者面談実施（2名クロージング）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k046">NTTデータ・ウィズ：デジタルストラテジー事業本部にBPOスキル人材を提案</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k047">NTTテクノクロス：IOWNクロスバリュー・AI事業部への候補者2名提案（頓挫案件再起動）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k048">NTTデータNJK：初回訪問後の要件定義MTGセッティング</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k049">候補者データベース強化：下期想定スキルセットのピックアップ（30名分）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('nov-buka')">＋ 行動を追加</button></div>
      </div>
    </div>
          </div>
    <div class="milestone">
      <strong>📌 月末チェックポイント</strong>
      <span contenteditable="false" data-key="k050">累計46名達成 ／ Q3 KPI達成ペースを確認（面談77回の半数40回以上） ／ クロスリスティング初回稼働スタート</span>
    </div>
  </div>
</div>

<!-- December 2026 -->
<div class="month-card" id="card-dec">
  <div class="month-header" onclick="handleHeaderClick(event,'card-dec')">
    <div class="month-left">
      <div class="month-icon q3-icon">❄️</div>
      <div>
        <div class="month-title">2026年12月</div>
        <div class="month-sub" contenteditable="false" data-key="k051">Q3クローズ ／ クロージング全集中</div>
      </div>
    </div>
    <div class="month-right">
      <div class="month-target">
        <div class="month-target-num" style="color:#818cf8" contenteditable="false" data-key="k052">57名</div>
        <div class="month-target-label">月末累計目標</div>
      </div>
      <div class="month-progress">
        <div class="prog-bar"><div class="prog-fill" style="width:63%"></div></div>
        <span contenteditable="false" data-key="k053">63%</span>
      </div>
      <div class="chevron">▼</div>
    </div>
  </div>
  <div class="month-body">
    <div class="kpi-row">
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k054">+11名</span><span class="kpi-lbl">今月新規目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k055">26回</span><span class="kpi-lbl">面談実施目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k056">126件</span><span class="kpi-lbl">候補提示目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k057">27件</span><span class="kpi-lbl">案件数目標</span></div>
    </div>
    <div class="role-sections">
      <div class="role-card masuko-card">
        <div class="role-header">
          <div class="role-avatar masuko-avatar">益</div>
          <div><div class="role-name" contenteditable="false" data-key="k058">益子</div><div class="role-title" contenteditable="false" data-key="k059">マネージャー ／ 最重要企業担当</div></div>
        </div>
        <ul class="action-list" id="dec-masuko">
          <li><span class="li-text" contenteditable="false" data-key="k060">BREXA：年内着手を目指す候補者のクロージング（内定・稼働スタート）優先</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k061">eSOL：BP経由案件の候補者に稼働OKを取得。年度替わりに向けた追加ニーズ確認</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k062">NTTドコモビジネス：提案した候補者の面談実施。年内合意を目指す</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k063">Q4に向けた顧問連携先との関係性を整備（志賀さんとの作戦会議）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k064">Q3全体のKGI達成状況を整理し、Q4の修正アクション計画を作成</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('dec-masuko')">＋ 行動を追加</button></div>
      </div>
      <div class="role-card buka-card">
        <div class="role-header">
          <div class="role-avatar buka-avatar">部</div>
          <div><div class="role-name" contenteditable="false" data-key="k065">部下</div><div class="role-title" contenteditable="false" data-key="k066">担当 ／ 重要企業実行</div></div>
        </div>
        <ul class="action-list" id="dec-buka">
          <li><span class="li-text" contenteditable="false" data-key="k067">NTTデータ・ウィズ：年内内定に向けた面談クロージング（調達・パートナー推進部3名目標）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k068">NTTドコモビジネスX：要件確定後、候補者2名の面談実施</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k069">NTTテクノクロス：提案候補者の面談実施・年内合意取得</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k070">NTTデータNJK：要件定義完了→候補者1名選定・提案</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k071">Q4着手に向けた新規パイプライン（候補者50名分）構築</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('dec-buka')">＋ 行動を追加</button></div>
      </div>
    </div>
          </div>
    <div class="milestone">
      <strong>📌 Q3クローズ チェックポイント</strong>
      <span contenteditable="false" data-key="k072">累計57名（KGI目標の63%）達成 ／ 年内稼働確定者リスト共有 ／ Q4修正アクション計画確定</span>
    </div>
  </div>
</div>

<!-- Q4 Label -->
<div class="quarter-label" style="margin-top:20px;">
  <span class="q-badge q4-badge">Q4</span>
  <span class="q-theme" contenteditable="false" data-key="k073">2027年1〜3月 ／ 刈り取り・KGI達成</span>
</div>

<!-- January 2027 -->
<div class="month-card" id="card-jan">
  <div class="month-header" onclick="handleHeaderClick(event,'card-jan')">
    <div class="month-left">
      <div class="month-icon q4-icon">🌸</div>
      <div>
        <div class="month-title">2027年1月</div>
        <div class="month-sub" contenteditable="false" data-key="k074">Q4スタート ／ 刈り取り本格化</div>
      </div>
    </div>
    <div class="month-right">
      <div class="month-target">
        <div class="month-target-num" style="color:#f472b6" contenteditable="false" data-key="k075">68名</div>
        <div class="month-target-label">月末累計目標</div>
      </div>
      <div class="month-progress">
        <div class="prog-bar"><div class="prog-fill" style="width:76%; background: linear-gradient(90deg,#ec4899,#f472b6);"></div></div>
        <span contenteditable="false" data-key="k076">76%</span>
      </div>
      <div class="chevron">▼</div>
    </div>
  </div>
  <div class="month-body">
    <div class="kpi-row">
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k077">+11名</span><span class="kpi-lbl">今月新規目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k078">30回</span><span class="kpi-lbl">面談実施目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k079">152件</span><span class="kpi-lbl">候補提示目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k080">32件</span><span class="kpi-lbl">案件数目標</span></div>
    </div>
    <div class="role-sections">
      <div class="role-card masuko-card">
        <div class="role-header">
          <div class="role-avatar masuko-avatar">益</div>
          <div><div class="role-name" contenteditable="false" data-key="k081">益子</div><div class="role-title" contenteditable="false" data-key="k082">マネージャー ／ 最重要企業担当</div></div>
        </div>
        <ul class="action-list" id="jan-masuko">
          <li><span class="li-text" contenteditable="false" data-key="k083">BREXA：Q4向けにDXコンサル部・AI推進部の新規5名枠確保。年明け面談即開始</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k084">eSOL：4名追加枠に対して、BP紹介案件・直接案件双方でパイプライン確保</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k085">NTTドコモビジネス：法人DX・クラウドセキュリティ部門への候補者提案（2名）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k086">フォーティエンスコンサルティング：3ヶ月フォローアップMTGで追加1名案件化</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k087">Q4 KGI到達に向けたチーム目標の再設定・月次面談で部下モチベーション管理</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('jan-masuko')">＋ 行動を追加</button></div>
      </div>
      <div class="role-card buka-card">
        <div class="role-header">
          <div class="role-avatar buka-avatar">部</div>
          <div><div class="role-name" contenteditable="false" data-key="k088">部下</div><div class="role-title" contenteditable="false" data-key="k089">担当 ／ 重要企業実行</div></div>
        </div>
        <ul class="action-list" id="jan-buka">
          <li><span class="li-text" contenteditable="false" data-key="k090">NTTデータ・ウィズ：BPOサービス事業本部へ追加2名提案・面談実施</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k091">NTTドコモビジネスX：ICTソリューション事業部へ候補者面談（2名目標）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k092">NTTテクノクロス：クロスプラットフォーム事業部への追加提案</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k093">アテック・LINK AI・AGEST：稼働実績をもとに追加案件ニーズ掘り起こし</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k094">スリーシェイク：調達部への追加2名打診（現在2名稼働の深耕）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('jan-buka')">＋ 行動を追加</button></div>
      </div>
    </div>
          </div>
    <div class="milestone">
      <strong>📌 月末チェックポイント</strong>
      <span contenteditable="false" data-key="k095">累計68名達成 ／ BREXA・eSOLのQ4分面談パイプライン完備 ／ 残り22名への道筋確定</span>
    </div>
  </div>
</div>

<!-- February 2027 -->
<div class="month-card" id="card-feb">
  <div class="month-header" onclick="handleHeaderClick(event,'card-feb')">
    <div class="month-left">
      <div class="month-icon q4-icon">💐</div>
      <div>
        <div class="month-title">2027年2月</div>
        <div class="month-sub" contenteditable="false" data-key="k096">Q4中盤 ／ 全社クロージング</div>
      </div>
    </div>
    <div class="month-right">
      <div class="month-target">
        <div class="month-target-num" style="color:#f472b6" contenteditable="false" data-key="k097">79名</div>
        <div class="month-target-label">月末累計目標</div>
      </div>
      <div class="month-progress">
        <div class="prog-bar"><div class="prog-fill" style="width:88%; background: linear-gradient(90deg,#ec4899,#f472b6);"></div></div>
        <span contenteditable="false" data-key="k098">88%</span>
      </div>
      <div class="chevron">▼</div>
    </div>
  </div>
  <div class="month-body">
    <div class="kpi-row">
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k099">+11名</span><span class="kpi-lbl">今月新規目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k100">30回</span><span class="kpi-lbl">面談実施目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k101">153件</span><span class="kpi-lbl">候補提示目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k102">32件</span><span class="kpi-lbl">案件数目標</span></div>
    </div>
    <div class="role-sections">
      <div class="role-card masuko-card">
        <div class="role-header">
          <div class="role-avatar masuko-avatar">益</div>
          <div><div class="role-name" contenteditable="false" data-key="k103">益子</div><div class="role-title" contenteditable="false" data-key="k104">マネージャー ／ 最重要企業担当</div></div>
        </div>
        <ul class="action-list" id="feb-masuko">
          <li><span class="li-text" contenteditable="false" data-key="k105">BREXA・eSOLのパイプライン候補者を全力でクロージング（内定→稼働確定）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k106">NTTドコモビジネス：3月着手に向けた候補者の内定確定と契約手続き推進</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k107">90名達成に向けた進捗差異分析→遅延企業へのリカバリプラン発動</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k108">NTTデータ・ウィズ：BPOサービス本部への候補者着地確認</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k109">部下の成果物レビュー・来期の体制強化に向けた評価面談準備</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('feb-masuko')">＋ 行動を追加</button></div>
      </div>
      <div class="role-card buka-card">
        <div class="role-header">
          <div class="role-avatar buka-avatar">部</div>
          <div><div class="role-name" contenteditable="false" data-key="k110">部下</div><div class="role-title" contenteditable="false" data-key="k111">担当 ／ 重要企業実行</div></div>
        </div>
        <ul class="action-list" id="feb-buka">
          <li><span class="li-text" contenteditable="false" data-key="k112">クロスリスティング：DATAソリューション事業部への追加1名面談実施</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k113">NTTテクノクロス：AI・データビジネス推進部 残2名のクロージング</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k114">NTTデータNJK：Q3からの案件を継続クロージング（残1名）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k115">NTTドコモビジネスX：3月稼働開始に向けた内定確定・契約手続き</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k116">新規パイプライン開拓（NTTデータグループ内の未開拓部署へのアプローチ）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('feb-buka')">＋ 行動を追加</button></div>
      </div>
    </div>
          </div>
    <div class="milestone">
      <strong>📌 月末チェックポイント</strong>
      <span contenteditable="false" data-key="k117">累計79名達成（KGI88%） ／ 3月スタート予定者を含む内定確定者リスト整備 ／ 残11名の3月達成計画確定</span>
    </div>
  </div>
</div>

<!-- March 2027 -->
<div class="month-card" id="card-mar">
  <div class="month-header" onclick="handleHeaderClick(event,'card-mar')">
    <div class="month-left">
      <div class="month-icon q4-icon">🎊</div>
      <div>
        <div class="month-title">2027年3月</div>
        <div class="month-sub" contenteditable="false" data-key="k118">Q4クローズ ／ KGI 90名 達成月</div>
      </div>
    </div>
    <div class="month-right">
      <div class="month-target">
        <div class="month-target-num" style="color:#f59e0b" contenteditable="false" data-key="k119">90名</div>
        <div class="month-target-label">KGI達成目標</div>
      </div>
      <div class="month-progress">
        <div class="prog-bar"><div class="prog-fill" style="width:100%; background: linear-gradient(90deg,#f59e0b,#fbbf24);"></div></div>
        <span contenteditable="false" data-key="k120">100%</span>
      </div>
      <div class="chevron">▼</div>
    </div>
  </div>
  <div class="month-body">
    <div class="kpi-row">
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k121">+11名</span><span class="kpi-lbl">今月新規目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k122">31回</span><span class="kpi-lbl">面談実施目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k123">152件</span><span class="kpi-lbl">候補提示目標</span></div>
      <div class="kpi-chip"><span class="kpi-val" contenteditable="false" data-key="k124">32件</span><span class="kpi-lbl">案件数目標</span></div>
    </div>
    <div class="role-sections">
      <div class="role-card masuko-card">
        <div class="role-header">
          <div class="role-avatar masuko-avatar">益</div>
          <div><div class="role-name" contenteditable="false" data-key="k125">益子</div><div class="role-title" contenteditable="false" data-key="k126">マネージャー ／ 最重要企業担当</div></div>
        </div>
        <ul class="action-list" id="mar-masuko">
          <li><span class="li-text" contenteditable="false" data-key="k127">全稼働予定者の3月1日スタートを確認・契約書・業務委託確定</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k128">BREXA・eSOL・NTTドコモビジネスの残クロージング全完了</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k129">KGI 90名を最終確認→必要なら追加候補者の緊急手配</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k130">来期（4月以降）に向けた顧問連携・既存企業深耕の中期計画を策定</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k131">部下の下期成果評価レポート作成・次期目標設定</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('mar-masuko')">＋ 行動を追加</button></div>
      </div>
      <div class="role-card buka-card">
        <div class="role-header">
          <div class="role-avatar buka-avatar">部</div>
          <div><div class="role-name" contenteditable="false" data-key="k132">部下</div><div class="role-title" contenteditable="false" data-key="k133">担当 ／ 重要企業実行</div></div>
        </div>
        <ul class="action-list" id="mar-buka">
          <li><span class="li-text" contenteditable="false" data-key="k134">担当全社の稼働スタート確認・初月フォローアップ対応</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k135">NTTドコモビジネスX・NTTデータNJKの最終着地確認と稼働報告</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k136">3月末KGIが不足する場合、緊急候補者提案を益子と共同対応</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k137">来期に向けた担当企業の関係構築計画書を作成</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
          <li><span class="li-text" contenteditable="false" data-key="k138">下期活動ログを整理・振り返りレポート作成（siaction記録）</span><button class="del-btn" onclick="delLi(this)">✕</button></li>
        </ul>
        <div class="add-action-row"><button class="btn btn-add" onclick="addLi('mar-buka')">＋ 行動を追加</button></div>
      </div>
    </div>
          </div>
    <div class="milestone" style="background: rgba(245,158,11,0.08); border-color: var(--buka); color: #fcd34d;">
      <strong>🏆 KGI達成チェックポイント</strong>
      <span contenteditable="false" data-key="k139">稼働90名達成 ／ 全稼働者の稼働スタート確認 ／ 次期中期計画策定完了</span>
    </div>
  </div>
</div>

<div class="footer">
  SIer二次請企業開拓 ｜ KGI 90名（改訂）達成計画 ｜ 益子チーム 2名体制<br>
  <span id="footerStatLine">現在稼働24名 → 2027年3月末 90名 ｜ 月平均+11名ペース</span>
</div>
</div>

<div class="toast" id="toast">✅ HTMLを保存しました</div>


<!-- BP Attack List Section -->
<div style="margin-top:40px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
    <h2 style="font-size:18px;font-weight:700;background:linear-gradient(135deg,#10b981,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">🎯 BP獲得アタックリスト</h2>
    <span style="font-size:11px;color:var(--text-muted);background:var(--surface2);padding:3px 10px;border-radius:20px;border:1px solid var(--border);">組込み系企業 関東 52社</span>
  </div>

  <!-- Controls -->
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:center;">
    <input type="text" id="bpSearch" placeholder="🔍 会社名・技術で検索..." oninput="renderBP()" style="flex:1;min-width:160px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 12px;color:var(--text);font-size:12px;outline:none;">
    <div style="display:flex;gap:4px;">
      <button class="bp-filter active" data-p="all" onclick="setPFilter(this,'all')">全て</button>
      <button class="bp-filter" data-p="A" onclick="setPFilter(this,'A')">A 即アプローチ</button>
      <button class="bp-filter" data-p="B" onclick="setPFilter(this,'B')">B 中期</button>
      <button class="bp-filter" data-p="C" onclick="setPFilter(this,'C')">C 情報収集</button>
    </div>
  </div>

  <div id="bp-count" style="font-size:11px;color:var(--text-muted);margin-bottom:8px;"></div>

  <!-- Table -->
  <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border);">
    <table id="bpTable" style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:var(--surface2);border-bottom:1px solid var(--border);">
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;white-space:nowrap;">優先</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;">会社名</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;white-space:nowrap;">所在</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;">主要技術</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;">アライアンス観点</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;white-space:nowrap;">AI</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;white-space:nowrap;">ステータス</th>
          <th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-weight:600;">Webサイト</th>
        </tr>
      </thead>
      <tbody id="bpBody"></tbody>
    </table>
  </div>
  <div style="margin-top:8px;font-size:10px;color:var(--text-muted);">
    ※ ステータスは編集モードONでセルをクリック→選択・変更できます。保存は「HTMLで保存」ボタン。
  </div>
</div>

`;

const MonthlyActionsView = () => {
  useEffect(() => {

    let editMode = false;

    const MONTHLY_ROW_ID = "main"; // monthly_action_data テーブルの単一行ID

    // このページの編集可能テキスト139箇所に割り振られた固定キー一覧。
    // 今後この一覧にない新しい編集項目を追加する場合は、末尾に新しいキーを足すだけでよく、
    // 既存キーの保存データには一切影響しません（構造を変えても既存の編集内容は消えません）。
    const ALL_STATIC_KEYS = ["k001", "k002", "k003", "k004", "k005", "k006", "k007", "k008", "k009", "k010", "k011", "k012", "k013", "k014", "k015", "k016", "k017", "k018", "k019", "k020", "k021", "k022", "k023", "k024", "k025", "k026", "k027", "k028", "k029", "k030", "k031", "k032", "k033", "k034", "k035", "k036", "k037", "k038", "k039", "k040", "k041", "k042", "k043", "k044", "k045", "k046", "k047", "k048", "k049", "k050", "k051", "k052", "k053", "k054", "k055", "k056", "k057", "k058", "k059", "k060", "k061", "k062", "k063", "k064", "k065", "k066", "k067", "k068", "k069", "k070", "k071", "k072", "k073", "k074", "k075", "k076", "k077", "k078", "k079", "k080", "k081", "k082", "k083", "k084", "k085", "k086", "k087", "k088", "k089", "k090", "k091", "k092", "k093", "k094", "k095", "k096", "k097", "k098", "k099", "k100", "k101", "k102", "k103", "k104", "k105", "k106", "k107", "k108", "k109", "k110", "k111", "k112", "k113", "k114", "k115", "k116", "k117", "k118", "k119", "k120", "k121", "k122", "k123", "k124", "k125", "k126", "k127", "k128", "k129", "k130", "k131", "k132", "k133", "k134", "k135", "k136", "k137", "k138", "k139"];

    let bpStatuses = {};
    let bpWebOverrides = {};
    let monthlyDataReady = false;

    async function saveMonthlyData(partial) {
      try {
        await supabase.from("monthly_action_data").upsert({
          id: MONTHLY_ROW_ID,
          ...partial,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        // ネットワークエラー時は保存できないが、画面上の編集内容は残る
        console.error("monthly_action_data save failed", e);
      }
    }

    // 現在の画面から「編集内容」だけを、要素ごとの固定キーで抜き出す（丸ごとHTMLではなく項目単位で保存）
    function collectPlanFields() {
      const root = document.getElementById('plan-content');
      const fieldText = {};
      const addedItems = [];
      if (!root) return { fieldText, addedItems, removedKeys: [] };

      const presentStaticKeys = new Set();
      root.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        fieldText[key] = el.innerHTML;
        if (el.getAttribute('data-added') === 'true') {
          const li = el.closest('li');
          const ul = li ? li.closest('ul') : null;
          addedItems.push({ key, listId: ul ? ul.id : '' });
        } else {
          presentStaticKeys.add(key);
        }
      });
      const removedKeys = ALL_STATIC_KEYS.filter(k => !presentStaticKeys.has(k));

      return { fieldText, addedItems, removedKeys };
    }

    function savePlanContent() {
      const fields = collectPlanFields();
      saveMonthlyData({ plan_content_fields: fields });
    }

    // 保存された「項目単位のデータ」を、今のページ構造に対して適用する。
    // テンプレート側の見た目・構造をあとから変更しても、キーが一致する項目の中身はそのまま復元される。
    function applyPlanFields(fields) {
      const root = document.getElementById('plan-content');
      if (!root || !fields) return;
      const fieldText = fields.fieldText || {};
      const removedKeys = fields.removedKeys || [];
      const addedItems = fields.addedItems || [];

      // 1. ユーザーが削除していた元テンプレ項目を、今回のテンプレートからも削除
      removedKeys.forEach(key => {
        const el = root.querySelector(`[data-key="${key}"]`);
        if (el) { const li = el.closest('li'); (li || el).remove(); }
      });

      // 2. 今も存在する項目のテキストを、保存内容で復元
      root.querySelectorAll('[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        if (fieldText[key] !== undefined) el.innerHTML = fieldText[key];
      });

      // 3. ユーザーが追加した項目（行動リストの＋で追加した行など）を再構築
      addedItems.forEach(item => {
        const ul = document.getElementById(item.listId);
        if (!ul) return; // 対象のリスト自体が無くなっていた場合はスキップ
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.className = 'li-text';
        span.setAttribute('data-key', item.key);
        span.setAttribute('data-added', 'true');
        span.contentEditable = editMode ? 'true' : 'false';
        span.innerHTML = fieldText[item.key] !== undefined ? fieldText[item.key] : '';
        const delBtn = document.createElement('button');
        delBtn.className = 'del-btn';
        delBtn.textContent = '✕';
        delBtn.setAttribute('onclick', 'delLi(this)');
        li.appendChild(span);
        li.appendChild(delBtn);
        ul.appendChild(li);
      });
    }

    async function loadMonthlyData() {
      try {
        const { data, error } = await supabase
          .from("monthly_action_data")
          .select("*")
          .eq("id", MONTHLY_ROW_ID)
          .maybeSingle();
        if (!error && data) {
          applyPlanFields(data.plan_content_fields);
          bpStatuses = data.bp_statuses || {};
          bpWebOverrides = data.bp_web_overrides || {};
        }
      } catch (e) {
        console.error("monthly_action_data load failed", e);
      }
      monthlyDataReady = true;
      renderBP();       // データ取得後にBPリストを描画
      loadLiveKgiStats(); // KGI稼働数もあわせて反映
    }

    // (loadMonthlyData is invoked directly below, after all functions are defined)

    // 「編集完了」ボタンを押し忘れても消えないよう、入力のたびに自動保存する
    let planSaveTimer = null;
    function debouncedSavePlanContent() {
      clearTimeout(planSaveTimer);
      planSaveTimer = setTimeout(savePlanContent, 600);
    }
    const handleGlobalInput = (e) => {
      if (e.target && e.target.isContentEditable) debouncedSavePlanContent();
    };
    const handleGlobalBlur = (e) => {
      if (e.target && e.target.isContentEditable) savePlanContent();
    };
    document.addEventListener('input', handleGlobalInput);
    document.addEventListener('blur', handleGlobalBlur, true); // blurはバブリングしないためcaptureで拾う

    // ── 稼働者管理ページ（Supabase engineersテーブル）と連動した現在稼働数の自動反映 ──
    const KGI_MONTHS_REMAINING = 6; // 下期(2026年10月〜2027年3月)の残り月数
    let liveCurrentCount = null;

    function updateKgiStatsDisplay() {
      if (liveCurrentCount === null) return;
      const ids = ['kgiTargetVal','statCurrent','statRemain','statAvg','kgiSubtitle','kgiBarFill','kgiPercentText','footerStatLine'];
      const el = {};
      for (const id of ids) { el[id] = document.getElementById(id); if (!el[id]) return; } // 要素が見つからない場合は何もしない
      const target = parseInt(el.kgiTargetVal.textContent, 10) || 90;
      const remain = Math.max(target - liveCurrentCount, 0);
      const avg = Math.ceil(remain / KGI_MONTHS_REMAINING);
      const pct = target > 0 ? Math.min(Math.round((liveCurrentCount / target) * 100), 100) : 0;

      el.statCurrent.textContent = liveCurrentCount;
      el.statRemain.textContent = remain;
      el.statAvg.textContent = avg;
      el.kgiSubtitle.textContent = `現在 ${liveCurrentCount}名 → 下期で +${remain}名 追加が必要`;
      el.kgiBarFill.style.width = pct + '%';
      el.kgiPercentText.textContent = `${pct}% 達成（稼働者管理ページと連動・自動更新）`;
      el.footerStatLine.textContent = `現在稼働${liveCurrentCount}名 → 2027年3月末 ${target}名 ｜ 月平均+${avg}名ペース`;
    }

    async function loadLiveKgiStats() {
      try {
        const { count, error } = await supabase
          .from('engineers')
          .select('*', { count: 'exact', head: true })
          .eq('status', '稼働中');
        if (error || count === null) return; // 取得失敗時は元の静的な数値のまま表示
        liveCurrentCount = count;
        updateKgiStatsDisplay();
      } catch (e) {
        // ネットワークエラー時は何もしない（元の数値のまま）
      }
    }

    const kgiTargetElForBlur = document.getElementById('kgiTargetVal');
    if (kgiTargetElForBlur) kgiTargetElForBlur.addEventListener('blur', updateKgiStatsDisplay);

    function toggleEdit() {
      editMode = !editMode;
      document.body.classList.toggle('edit-mode', editMode);
      const btn = document.getElementById('editBtn');
      btn.classList.toggle('active', editMode);
      btn.textContent = editMode ? '✅ 編集完了' : '✏️ 編集モード';

      // contenteditable の切り替え
      document.querySelectorAll('[contenteditable]').forEach(el => {
        el.contentEditable = editMode ? 'true' : 'false';
      });

      // 編集モードを終了するタイミングで、変更内容をブラウザに保存する
      if (!editMode) savePlanContent();
      // BPリストのWebサイト欄（入力欄⇔リンク表示）を切り替え
      if (typeof renderBP === 'function') renderBP();
    }

    function handleHeaderClick(e, id) {
      // 編集モード中は contenteditable 要素クリックでトグルしない
      if (editMode && e.target.hasAttribute && e.target.contentEditable === 'true') return;
      if (editMode && e.target.closest('[contenteditable="true"]')) return;
      toggle(id);
    }

    function toggle(id) {
      const card = document.getElementById(id);
      card.classList.toggle('open');
    }

    function delLi(btn) {
      btn.closest('li').remove();
      savePlanContent();
    }

    function addLi(listId) {
      const ul = document.getElementById(listId);
      const li = document.createElement('li');
      const newKey = 'kNew' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      li.innerHTML = `<span class="li-text" contenteditable="true" data-key="${newKey}" data-added="true">新しい行動を入力...</span><button class="del-btn" onclick="delLi(this)">✕</button>`;
      ul.appendChild(li);
      savePlanContent();
      // フォーカス
      setTimeout(() => {
        const span = li.querySelector('.li-text');
        span.focus();
        const range = document.createRange();
        range.selectNodeContents(span);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }, 50);
    }

    function saveHTML() {
      // 編集モード一時解除してHTMLを取得
      const wasEditing = editMode;
      if (wasEditing) toggleEdit();

      const html = '<!DOCTYPE html>\n<html lang="ja">\n' + document.documentElement.innerHTML + '\n</html>';

      if (wasEditing) toggleEdit();

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'monthly-actions-plan.html';
      a.click();
      URL.revokeObjectURL(a.href);

      const toast = document.getElementById('toast');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    const STATUSES = ['未接触','検討中','アプローチ済','商談中','アライアンス締結','見送り'];
    const BP_LIST = [
      {no:1,name:'ナイン・アルファ合同会社',pref:'神奈川県',scale:'小規模（数名）',tech:'組込みソフト／デバイスドライバ／無線（Wi-Fi・BT・RFID/NFC）／HW設計',alliance:'少数精鋭。車載・家電・精密機器の実績多数。フリーランスと親和性が高い',web:'（要確認）',priority:'A',status:'未接触',ai:'-'},
      {no:2,name:'株式会社ソールテック',pref:'東京都',scale:'小規模',tech:'組込みシステム／医療機器制御／セキュリティ装置／通信監視装置',alliance:'医療・セキュリティ・通信の受託実績豊富。制御＋サーバー両対応',web:'https://www.soul-tech.co.jp/',priority:'A',status:'未接触',ai:'○'},
      {no:3,name:'株式会社ウッドペッカー',pref:'神奈川県',scale:'小規模',tech:'組込みシステム／既存システム解析・改修／大規模制御',alliance:'既存システム解析を得意とし、改修・保守案件が多い',web:'（要確認）',priority:'A',status:'未接触',ai:'-'},
      {no:4,name:'株式会社WILLTECH',pref:'東京都',scale:'小規模',tech:'組込みソフト／デジタル家電／PLC制御／車載IVI／産業機械FA',alliance:'大手電機・自動車メーカー出身者集団。品質管理体制が強固',web:'（要確認）',priority:'A',status:'未接触',ai:'△'},
      {no:5,name:'株式会社アヴァンザ',pref:'東京都',scale:'小〜中規模',tech:'組込みソフト＋HW／RFID・ICタグ／画像認識／リアルタイム制御',alliance:'ソフトのみならずHW選定・カスタムHW開発まで対応。RFID系に強み',web:'https://www.avanza.co.jp/',priority:'A',status:'未接触',ai:'○'},
      {no:6,name:'ナパソリューションズ株式会社',pref:'東京都',scale:'小規模',tech:'車載システム／カーナビ・ECU開発／MBD（モデルベース開発）',alliance:'車載特化。MBD活用でコスト削減提案が可能。ベトナム合弁',web:'https://www.napa-solutions.jp/',priority:'A',status:'未接触',ai:'△'},
      {no:7,name:'株式会社サン・メルクス',pref:'東京都',scale:'小〜中規模',tech:'制御システム／AI×組込み画像解析／電力・金融向けシステム',alliance:'原子力・電力系制御の高信頼性実績。AI画像解析組込みも展開',web:'（要確認）',priority:'B',status:'未接触',ai:'○'},
      {no:8,name:'株式会社フジシステムズ',pref:'神奈川県',scale:'中規模',tech:'組込み（カーナビ・携帯）→ Web・IoTデバイス',alliance:'組込み出身でIoT・Webへ転換。フジサンケイグループ系',web:'（要確認）',priority:'B',status:'未接触',ai:'-'},
      {no:9,name:'株式会社D-design',pref:'東京都',scale:'小規模',tech:'組込みソフト開発／要件定義〜テストまで一貫対応',alliance:'東京・神奈川・埼玉に対応。中小企業向けフルサービス',web:'https://www.d-dsn.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:10,name:'株式会社ブリリアントサービス',pref:'東京都',scale:'小規模',tech:'組込みソフト／ミドルウェア／デバイスドライバ／ウェアラブル／車載',alliance:'車載・ウェアラブル領域に幅広く対応。AR/VRも展開',web:'https://www.brilliantservice.co.jp/',priority:'B',status:'未接触',ai:'○'},
      {no:11,name:'SHIMOHA Inc.',pref:'東京都',scale:'小規模',tech:'IoT組込み開発／FreeRTOS・Zephyr・TOPPERS・Azure RTOS対応',alliance:'RTOS複数対応。大手SIerが断る小〜中規模IoTに特化',web:'https://www.shimoha.co.jp/',priority:'A',status:'未接触',ai:'○'},
      {no:12,name:'ソーバル株式会社',pref:'東京都',scale:'中規模（上場）',tech:'組込みシステム＋HW（LSI）／プリンタ・カメラ／車載・5G',alliance:'キヤノン・ソニー・富士通グループ向け実績。規模がやや大きい',web:'https://www.sobal.co.jp/',priority:'C',status:'未接触',ai:'-'},
      {no:13,name:'株式会社feat',pref:'神奈川県',scale:'中規模（約130名）',tech:'組込みソフト開発（車載・医療・通信・産業機器）／テスト・評価',alliance:'プライム案件90%以上。受託・常駐・派遣の複合対応',web:'https://www.feat-co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:14,name:'アドバンスデザインテクノロジー株式会社',pref:'東京都',scale:'中小規模',tech:'組込み開発ツール・テスト支援／組込みソフト受託',alliance:'JASA会員。設計支援ツールと受託開発の両輪',web:'http://www.adte.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:15,name:'アドバンストシステムズ株式会社',pref:'東京都',scale:'中小規模',tech:'組込みシステム開発／制御系ソフト',alliance:'JASA会員。制御系組込みを得意とする',web:'http://www.asco.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:16,name:'株式会社アドバンスド・データ・コントロールズ',pref:'東京都',scale:'小規模',tech:'組込み系ソフトウェア開発／データ制御システム',alliance:'JASA会員。データ制御特化の組込み開発',web:'http://www.adac.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:17,name:'アンドールシステムサポート株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発サポート／技術支援',alliance:'JASA会員。組込み開発支援・サポート特化',web:'https://www.andor.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:18,name:'株式会社アックス',pref:'東京都',scale:'小規模',tech:'組込みLinux／OSS活用組込み開発／ITron系',alliance:'JASA会員。組込みLinux・OSSに強みを持つ',web:'http://www.axe.bz/',priority:'A',status:'未接触',ai:'△'},
      {no:19,name:'株式会社エクスモーション',pref:'東京都',scale:'小〜中規模',tech:'組込みソフト開発プロセス改善／アジャイル組込み開発',alliance:'JASA会員。開発プロセス・品質改善コンサルも展開',web:'https://www.exmotion.co.jp/',priority:'B',status:'未接触',ai:'○'},
      {no:20,name:'株式会社エンファシス',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／制御・通信系ソフトウェア',alliance:'JASA会員。制御・通信領域の組込み受託',web:'http://www.emfasys.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:21,name:'株式会社コマス',pref:'東京都',scale:'小規模',tech:'組込みソフトウェア開発／FA・制御系',alliance:'JASA会員。FA・製造向け制御系組込みに実績',web:'https://www.comas.jp/',priority:'A',status:'未接触',ai:'-'},
      {no:22,name:'株式会社コンセプトアンドデザイン',pref:'東京都',scale:'小規模',tech:'組込みシステム設計・開発／UI設計も対応',alliance:'JASA会員。設計から実装まで一貫対応',web:'https://www.candd.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:23,name:'JRCエンジニアリング株式会社',pref:'東京都',scale:'中小規模',tech:'組込みシステム開発／無線・通信機器向けソフト',alliance:'JASA会員。通信・無線分野の組込みに実績',web:'https://www.jrce.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:24,name:'ジェネシス株式会社',pref:'東京都',scale:'小規模',tech:'組込みソフトウェア開発／リアルタイム制御',alliance:'JASA会員。リアルタイム制御系組込みを得意とする',web:'http://www.genesys.gr.jp/',priority:'A',status:'未接触',ai:'-'},
      {no:25,name:'株式会社システムクラフト',pref:'東京都',scale:'小〜中規模',tech:'組込みシステム開発／各種制御ソフト',alliance:'JASA会員。幅広い組込み受託実績',web:'https://www.scinet.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:26,name:'株式会社システムサイエンス研究所',pref:'東京都',scale:'小規模',tech:'組込みシステム研究・開発／先端技術応用',alliance:'JASA会員。研究開発よりの組込み開発',web:'http://www.sylc.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:27,name:'株式会社ストラテジー',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／戦略的ソフト開発支援',alliance:'JASA会員。小規模ながら幅広い組込み対応',web:'http://www.k-s-g.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:28,name:'株式会社ゼロソフト',pref:'東京都',scale:'小規模',tech:'組込みソフトウェア開発／IoT・機器制御',alliance:'JASA会員。IoT・機器制御の組込み受託',web:'https://www.zerosoft.co.jp/',priority:'A',status:'未接触',ai:'△'},
      {no:29,name:'株式会社Sohwa & Sophia Technologies',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／車載・産業機器向け',alliance:'JASA会員。車載・産業向け組込みに注力',web:'http://www.ss-technologies.co.jp/',priority:'A',status:'未接触',ai:'△'},
      {no:30,name:'大旺工業株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／産業機器・計測器向け',alliance:'JASA会員。産業機器・計測器向け組込み受託',web:'http://taiyo-kg.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:31,name:'株式会社D・Ace',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／ハードウェア・ソフトウェア一貫',alliance:'JASA会員。HW・SW一貫開発に対応',web:'https://d-ace.co.jp/',priority:'A',status:'未接触',ai:'-'},
      {no:32,name:'TDIプロダクトソリューション株式会社',pref:'東京都',scale:'中小規模',tech:'組込みシステム開発／産業・車載向けソフト',alliance:'JASA会員。産業・車載領域に実績',web:'https://www.tdips.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:33,name:'デンセイシリウス株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／電源・電力系制御ソフト',alliance:'JASA会員。電源・電力系制御組込みに特化',web:'https://www.denseisirius.com/',priority:'B',status:'未接触',ai:'-'},
      {no:34,name:'株式会社トーセーシステムズ',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／産業機器・FA向けソフト',alliance:'JASA会員。FA・産業向け組込みに実績',web:'https://www.toseisystems.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:35,name:'東信システムハウス株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／通信・ネットワーク機器向け',alliance:'JASA会員。通信・ネット機器向け組込みに強み',web:'http://www.toshin-sh.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:36,name:'株式会社永栄',pref:'東京都',scale:'小規模',tech:'組込みソフトウェア開発／制御系・産業機器',alliance:'JASA会員。制御・産業機器の組込み受託',web:'http://www.nagae-jp.com/',priority:'B',status:'未接触',ai:'-'},
      {no:37,name:'株式会社ニッキ',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／自動車・産業機器向け',alliance:'JASA会員。自動車・産業向け組込み実績',web:'http://www.nikkinet.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:38,name:'日本システム開発株式会社',pref:'東京都',scale:'中小規模',tech:'組込みシステム開発／制御・通信・FA向け',alliance:'JASA会員。幅広い業種の組込み受託実績',web:'https://www.nskint.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:39,name:'ノアソリューション株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／IoT・センサー系ソフト',alliance:'JASA会員。IoT・センサー系組込みに注力',web:'http://www.noahsi.com/',priority:'A',status:'未接触',ai:'△'},
      {no:40,name:'株式会社ノードゥス',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／機器制御・ファームウェア',alliance:'JASA会員。機器制御・ファームウェア受託',web:'https://www.nodus-inc.com/',priority:'A',status:'未接触',ai:'△'},
      {no:41,name:'株式会社ハイスポット',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／映像・AV機器向けソフト',alliance:'JASA会員。映像・AV機器向け組込みに強み',web:'https://www.hispot.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:42,name:'株式会社パトリオット',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／産業・計測機器向けソフト',alliance:'JASA会員。産業・計測機器向け組込み受託',web:'http://www.patriot.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:43,name:'ハル・エンジニアリング株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発・エンジニアリングサービス',alliance:'JASA会員。組込み開発全般に対応',web:'http://www.haleng.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:44,name:'株式会社ビー・メソッド',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／方法論ベース開発支援',alliance:'JASA会員。方法論・品質重視の組込み開発',web:'http://www.be-method.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:45,name:'株式会社ビッツ',pref:'東京都',scale:'中小規模',tech:'組込みシステム開発／通信・ネットワーク・車載',alliance:'JASA会員。東北・関西にも拠点あり',web:'https://www.bits.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:46,name:'フラットーク株式会社',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／制御ソフト受託',alliance:'JASA会員。小規模ながら制御系組込みに特化',web:'http://www.flatoak.co.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:47,name:'株式会社メタテクノ',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／医療・産業向けソフト',alliance:'JASA会員。医療・産業機器向け組込みに強み',web:'https://www.meta.co.jp/',priority:'A',status:'未接触',ai:'○'},
      {no:48,name:'株式会社ラデックス',pref:'東京都',scale:'小規模',tech:'組込みシステム開発／リアルタイム制御・計測',alliance:'JASA会員。リアルタイム制御・計測機器系に実績',web:'https://www.rdx.co.jp/',priority:'A',status:'未接触',ai:'△'},
      {no:49,name:'リネオソリューション株式会社',pref:'東京都',scale:'小規模',tech:'組込みLinux／Linuxカーネル・BSP開発',alliance:'JASA会員。組込みLinux専門。LinuxカーネルカスタマイズやBSP開発に特化',web:'https://www.lineo.co.jp/',priority:'A',status:'未接触',ai:'○'},
      {no:50,name:'株式会社グレープシステム',pref:'東京都',scale:'中小規模',tech:'組込みシステム開発／ルータ・ゲートウェイ・IoT',alliance:'JASA会員。ルータ・ゲートウェイ・IoT機器向け組込みに実績',web:'https://www.grape.co.jp/',priority:'A',status:'未接触',ai:'△'},
      {no:51,name:'株式会社アクティブ・ブレインズ・トラスト',pref:'東京都',scale:'小規模',tech:'組込みシステム開発・コンサルティング',alliance:'JASA会員。組込み開発コンサルも提供',web:'https://active-brains-trust.jp/',priority:'B',status:'未接触',ai:'-'},
      {no:52,name:'有限会社Orbis Brain',pref:'東京都',scale:'小規模（数名）',tech:'組込みシステム開発／IoT・小型デバイス向け',alliance:'JASA会員。超小規模。IoT・小型デバイス専門',web:'http://orbisbrain.com/',priority:'A',status:'未接触',ai:'△'},
    ];


    // BP list state
    let bpFilter = 'all';
    // bpStatuses / bpWebOverrides はページ上部で宣言済み（loadMonthlyDataでSupabaseから読み込み）

    function saveWeb(no, val) {
      bpWebOverrides[no] = val;
      saveMonthlyData({ bp_web_overrides: bpWebOverrides });
      renderBP();
    }

    function setPFilter(el, p) {
      bpFilter = p;
      document.querySelectorAll('.bp-filter').forEach(b => b.classList.remove('active'));
      el.classList.add('active');
      renderBP();
    }

    function saveStatus(no, val) {
      bpStatuses[no] = val;
      saveMonthlyData({ bp_statuses: bpStatuses });
    }

    function renderBP() {
      if (!monthlyDataReady) return; // Supabaseからのデータ取得が終わるまで描画しない
      const q = (document.getElementById('bpSearch')?.value || '').toLowerCase();
      const tbody = document.getElementById('bpBody');
      if (!tbody) return;
      const pColors = {A:'rgba(16,185,129,0.12)',B:'rgba(245,158,11,0.1)',C:'rgba(239,68,68,0.1)'};
      const pText = {A:'#34d399',B:'#fbbf24',C:'#f87171'};
      const sBg = {
        '未接触':'rgba(100,116,139,0.15)',
        '検討中':'rgba(245,158,11,0.15)',
        'アプローチ済':'rgba(99,102,241,0.15)',
        '商談中':'rgba(16,185,129,0.15)',
        'アライアンス締結':'rgba(16,185,129,0.3)',
        '見送り':'rgba(239,68,68,0.12)'
      };
      const sText = {
        '未接触':'#94a3b8','検討中':'#fbbf24','アプローチ済':'#818cf8',
        '商談中':'#34d399','アライアンス締結':'#10b981','見送り':'#f87171'
      };

      let filtered = BP_LIST.filter(r => {
        if (bpFilter !== 'all' && r.priority !== bpFilter) return false;
        if (q && !r.name.toLowerCase().includes(q) && !r.tech.toLowerCase().includes(q) && !r.alliance.toLowerCase().includes(q)) return false;
        return true;
      });

      document.getElementById('bp-count').textContent = filtered.length + ' 社表示';

      tbody.innerHTML = filtered.map(r => {
        const st = bpStatuses[r.no] || r.status;
        const webVal = bpWebOverrides[r.no] !== undefined ? bpWebOverrides[r.no] : r.web;
        const webCell = editMode
          ? `<input type="text" value="${webVal.startsWith('http')?webVal:''}" placeholder="URLを貼り付け" onchange="saveWeb(${r.no}, this.value)" style="width:140px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 6px;color:var(--text);font-size:10px;outline:none;">`
          : webVal.startsWith('http')
            ? `<a href="${webVal}" target="_blank" style="color:#818cf8;text-decoration:none;font-size:10px;" title="${webVal}">🔗 開く</a>`
            : `<span style="color:var(--text-muted);font-size:10px;">要確認</span>`;
        const aiCell = r.ai === '○' ? '<span style="color:#34d399;">○</span>' : r.ai === '△' ? '<span style="color:#fbbf24;">△</span>' : '<span style="color:#475569;">-</span>';
        const stOpts = STATUSES.map(s => `<option value="${s}" ${s===st?'selected':''}>${s}</option>`).join('');
        return `<tr style="border-bottom:1px solid var(--border);background:var(--surface);" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background='var(--surface)'">
          <td style="padding:7px 10px;white-space:nowrap;">
            <span style="background:${pColors[r.priority]};color:${pText[r.priority]};border-radius:6px;padding:2px 8px;font-weight:700;font-size:11px;">${r.priority}</span>
          </td>
          <td style="padding:7px 10px;font-weight:600;min-width:140px;">${r.name}</td>
          <td style="padding:7px 10px;white-space:nowrap;color:var(--text-muted);">${r.pref}</td>
          <td style="padding:7px 10px;color:var(--text-muted);font-size:11px;min-width:180px;">${r.tech}</td>
          <td style="padding:7px 10px;color:var(--text-muted);font-size:11px;min-width:180px;">${r.alliance}</td>
          <td style="padding:7px 10px;text-align:center;">${aiCell}</td>
          <td style="padding:7px 10px;">
            <select onchange="saveStatus(${r.no}, this.value)" style="background:${sBg[st]||'rgba(100,116,139,0.15)'};color:${sText[st]||'#94a3b8'};border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:3px 6px;font-size:11px;cursor:pointer;outline:none;" id="st-${r.no}">${stOpts}</select>
          </td>
          <td style="padding:7px 10px;">${webCell}</td>
        </tr>`;
      }).join('');

      // Update select colors on change
      filtered.forEach(r => {
        const sel = document.getElementById('st-' + r.no);
        if (sel) sel.onchange = function() {
          saveStatus(r.no, this.value);
          this.style.background = sBg[this.value] || 'rgba(100,116,139,0.15)';
          this.style.color = sText[this.value] || '#94a3b8';
        };
      });
    }



    // ── インライン onclick/onchange/oninput から呼べるよう、window にも公開する ──
    window.toggleEdit = toggleEdit;
    window.handleHeaderClick = handleHeaderClick;
    window.delLi = delLi;
    window.addLi = addLi;
    window.saveHTML = saveHTML;
    window.setPFilter = setPFilter;
    window.renderBP = renderBP;
    window.saveWeb = saveWeb;
    window.saveStatus = saveStatus;

    loadMonthlyData();

    return () => {
      document.removeEventListener('input', handleGlobalInput);
      document.removeEventListener('blur', handleGlobalBlur, true);
      clearTimeout(planSaveTimer);
      if (kgiTargetElForBlur) kgiTargetElForBlur.removeEventListener('blur', updateKgiStatsDisplay);
      delete window.toggleEdit;
      delete window.handleHeaderClick;
      delete window.delLi;
      delete window.addLi;
      delete window.saveHTML;
      delete window.setPFilter;
      delete window.renderBP;
      delete window.saveWeb;
      delete window.saveStatus;
    };

  }, []);

  return (
    <>
      <style>{MONTHLY_ACTIONS_CSS}</style>
      <div dangerouslySetInnerHTML={{ __html: MONTHLY_ACTIONS_BODY_HTML }} />
    </>
  );
};

// ── 営業戦略 ────────────────────────────────────────────────
const StrategyView = ({ companies, strategies, onRefresh }) => {
  const [selectedCo, setSelectedCo] = useState(companies[0]?.id || "");
  const [form,   setForm]   = useState({ midterm_plan:"", mission:"", job_openings:"", target_depts:"" });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    if (!selectedCo) return;
    const s = strategies.find(s => s.company_id === selectedCo);
    setForm({ midterm_plan:s?.midterm_plan||"", mission:s?.mission||"", job_openings:s?.job_openings||"", target_depts:s?.target_depts||"" });
  }, [selectedCo, strategies]);

  const handleSave = async () => {
    setSaving(true);
    const existing = strategies.find(s => s.company_id === selectedCo);
    const data = { ...form, company_id:selectedCo, updated_at:new Date().toISOString() };
    if (existing) {
      await supabase.from("company_strategy").update(data).eq("id", existing.id);
    } else {
      await supabase.from("company_strategy").insert([data]);
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onRefresh();
  };

  const co = companies.find(c => c.id === selectedCo);

  return (
    <div>
      <div style={{ ...S.card, display:"flex", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200 }}>
          <label style={ S.label }>企業を選択</label>
          <select value={selectedCo} onChange={e=>setSelectedCo(e.target.value)} style={ S.input }>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {co && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
            {co.category && <span style={{ fontSize:12, color:"#64748b" }}>{co.category}</span>}
            {co.unit_range && <span style={{ fontSize:12, color:"#475569" }}>{co.unit_range}</span>}
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        {[
          { key:"midterm_plan", label:"中長期経営計画", ph:"中期経営計画の概要、注力事業、数値目標などを記載..." },
          { key:"mission",      label:"ミッション・ビジョン・バリュー", ph:"企業のミッション・ビジョン・バリューを記載..." },
          { key:"job_openings", label:"現在の求人情報", ph:"現在募集中のポジション、スキル要件、単価感などを記載..." },
          { key:"target_depts", label:"アプローチ対象部署・担当者情報", ph:"キーパーソン、部署名、アポイントの状況などを記載..." },
        ].map(f => (
          <div key={f.key} style={ S.card }>
            <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:8 }}>{f.label}</div>
            <textarea value={form[f.key]} onChange={e=>setForm(fm=>({...fm,[f.key]:e.target.value}))}
              placeholder={f.ph}
              style={{ ...S.input, resize:"vertical", minHeight:120, fontSize:12 }} />
          </div>
        ))}
      </div>

      {co?.note && (
        <div style={{ ...S.card, borderColor:"#2563eb", marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:"#64748b", marginBottom:4 }}>戦略メモ（企業管理より）</div>
          <div style={{ fontSize:12, color:"#94a3b8" }}>{co.note}</div>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"flex-end" }}>
        <button onClick={handleSave}
          style={{ ...S.btn, background: saved?"#10b981":saving?"#1d4ed8":"#2563eb", color:"#fff", minWidth:100 }}>
          {saved ? "✓ 保存完了" : saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
};

// ── 活動記録モーダル ────────────────────────────────────────
const LogModal = ({ companies, departments, keyPersons, onClose, onSave }) => {
  const [form, setForm] = useState({
    company:"", department:"", date:new Date().toISOString().slice(0,10),
    person:"", partner_name:"", activity_type:"候補者提案", phase:"P3:提案・商談",
    status:"進行中", probability:"C（商談中）", memo:"", next_action:"", next_action_date:"",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    if (companies.length > 0) setForm(f => ({ ...f, company:companies[0].name }));
  }, [companies]);

  const depts = departments.filter(d => {
    const co = companies.find(c => c.name === form.company);
    return co && d.company_id === co.id;
  });

  const update = (key, val) => {
    setForm(f => {
      const next = { ...f, [key]:val };
      if (key === "company") next.department = "";
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.company) return;
    setSaving(true);
    const ok = await onSave(form);
    if (ok) { setSaved(true); setTimeout(() => { setSaved(false); setSaving(false); onClose(); }, 900); }
    else setSaving(false);
  };

  return (
    <ModalWrap onClose={onClose} title="活動記録">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

        {/* 行1: 企業名・部署名 */}
        <FormField label="企業名">
          <select value={form.company} onChange={e=>update("company",e.target.value)} style={ S.input }>
            <option value="">選択してください</option>
            {companies.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="部署名">
          <select value={form.department} onChange={e=>update("department",e.target.value)} style={ S.input }>
            <option value="">（未選択）</option>
            {depts.map(d=><option key={d.id}>{d.name}</option>)}
          </select>
        </FormField>

        {/* 行2: 先方担当者名・自分の担当者名 */}
        <FormField label="先方担当者名（営業先）">
          <input value={form.partner_name} onChange={e=>update("partner_name",e.target.value)}
            placeholder="例: 田中 部長" style={ S.input } />
        </FormField>
        <FormField label="自社担当者名">
          <input value={form.person} onChange={e=>update("person",e.target.value)}
            placeholder="例: 益子" style={ S.input } />
        </FormField>

        {/* 行3: 活動日・活動種別 */}
        <FormField label="活動日">
          <input type="date" value={form.date} onChange={e=>update("date",e.target.value)} style={ S.input } />
        </FormField>
        <FormField label="活動種別">
          <select value={form.activity_type} onChange={e=>update("activity_type",e.target.value)} style={ S.input }>
            {ACT_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </FormField>

        {/* 行4: フェーズ・ステータス */}
        <FormField label="フェーズ">
          <select value={form.phase} onChange={e=>update("phase",e.target.value)} style={ S.input }>
            {PHASES.map(p=><option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="ステータス">
          <select value={form.status} onChange={e=>update("status",e.target.value)} style={ S.input }>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </FormField>

        {/* 行5: 受注確度（1列） */}
        <FormField label="受注確度">
          <select value={form.probability} onChange={e=>update("probability",e.target.value)} style={ S.input }>
            {PROBS.map(p=><option key={p}>{p}</option>)}
          </select>
        </FormField>
        <div />

      </div>

      {/* 活動内容 */}
      <div style={{ marginTop:12 }}>
        <FormField label="活動内容・結果サマリー">
          <textarea value={form.memo} onChange={e=>update("memo",e.target.value)}
            placeholder="話した内容、先方の反応、次のアクションにつながる情報など"
            style={{ ...S.input, resize:"vertical", minHeight:80 }} />
        </FormField>
      </div>

      {/* 次回アクション・期日 */}
      <div style={{ marginTop:10, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <FormField label="次回アクション">
          <input value={form.next_action} onChange={e=>update("next_action",e.target.value)}
            placeholder="例: 候補者プロフィールを送付する" style={ S.input } />
        </FormField>
        <FormField label="次回アクション期日 🗓">
          <input type="date" value={form.next_action_date} onChange={e=>update("next_action_date",e.target.value)}
            style={{ ...S.input, colorScheme:"dark" }} />
        </FormField>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:18 }}>
        <button onClick={onClose} style={{ ...S.btn, background:"#334155", color:"#94a3b8" }}>キャンセル</button>
        <button onClick={handleSave} disabled={saving}
          style={{ ...S.btn, background:saved?"#10b981":saving?"#1d4ed8":"#2563eb", color:"#fff", minWidth:100 }}>
          {saved ? "✓ 保存完了" : saving ? "保存中..." : "記録する"}
        </button>
      </div>
    </ModalWrap>
  );
};

// ── テーマ設定パネル ─────────────────────────────────────────
const ThemePanel = ({ theme, onChange, onClose }) => {
  const T = theme;
  const Row = ({ label, themeKey, type="color" }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid "+T.border }}>
      <span style={{ fontSize:12, color:T.textSecondary }}>{label}</span>
      {type === "color" ? (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="color" value={theme[themeKey]} onChange={e=>onChange(themeKey, e.target.value)}
            style={{ width:36, height:28, border:"none", borderRadius:6, cursor:"pointer", background:"none" }} />
          <span style={{ fontSize:11, color:T.textMuted, fontFamily:"monospace" }}>{theme[themeKey]}</span>
        </div>
      ) : (
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <input type="range" min={8} max={24} value={theme[themeKey]}
            onChange={e=>onChange(themeKey, parseInt(e.target.value))}
            style={{ width:80 }} />
          <span style={{ fontSize:11, color:T.textMuted, minWidth:24 }}>{theme[themeKey]}px</span>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.bgCard, border:"1px solid "+T.border, borderRadius:16, padding:24, width:480, maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <div style={{ fontSize:15, fontWeight:700, color:T.textPrimary }}>🎨 テーマ設定</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.textMuted, fontSize:20, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:T.textLabel, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8, fontWeight:600 }}>背景色</div>
          <Row label="アプリ背景"     themeKey="bgApp" />
          <Row label="サイドバー背景" themeKey="bgSidebar" />
          <Row label="カード背景"     themeKey="bgCard" />
          <Row label="トップバー背景" themeKey="bgTopbar" />
          <Row label="入力欄背景"     themeKey="bgInput" />
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:T.textLabel, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8, fontWeight:600 }}>文字色</div>
          <Row label="メインテキスト"     themeKey="textPrimary" />
          <Row label="サブテキスト"       themeKey="textSecondary" />
          <Row label="薄いテキスト"       themeKey="textMuted" />
          <Row label="ラベル"             themeKey="textLabel" />
          <Row label="ボーダー"           themeKey="border" />
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:T.textLabel, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8, fontWeight:600 }}>アクセントカラー</div>
          <Row label="ブルー（メイン）"   themeKey="accentBlue" />
          <Row label="パープル（KGI）"    themeKey="accentPurple" />
          <Row label="グリーン（達成）"   themeKey="accentGreen" />
          <Row label="レッド（警告）"     themeKey="accentRed" />
          <Row label="アンバー（進行中）" themeKey="accentAmber" />
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:T.textLabel, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:8, fontWeight:600 }}>文字サイズ</div>
          <Row label="極小（注釈）"   themeKey="fontXs"    type="range" />
          <Row label="小（ラベル）"   themeKey="fontSm"    type="range" />
          <Row label="標準（本文）"   themeKey="fontBase"  type="range" />
          <Row label="大（見出し）"   themeKey="fontLg"    type="range" />
          <Row label="特大（数値）"   themeKey="fontXl"    type="range" />
          <Row label="タイトル"       themeKey="fontTitle" type="range" />
        </div>

        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={() => onChange("_reset", null)}
            style={{ flex:1, padding:"9px 0", background:T.border, color:T.textSecondary, border:"none", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
            リセット
          </button>
          <button onClick={onClose}
            style={{ flex:2, padding:"9px 0", background:T.accentBlue, color:"#fff", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", fontWeight:600 }}>
            閉じる（自動保存済み）
          </button>
        </div>
      </div>
    </div>
  );
};

// ── メインアプリ ────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState("dashboard");
  const [companies,    setCompanies]    = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [logs,         setLogs]         = useState([]);
  const [hearingData,  setHearingData]  = useState([]);
  const [salesProcess, setSalesProcess] = useState([]);
  const [strategies,   setStrategies]   = useState([]);
  const [keyPersons,   setKeyPersons]   = useState([]);
  const [engineers,    setEngineers]    = useState([]);
  const [archivedCos,  setArchivedCos]  = useState([]);
  const [archivedDepts,setArchivedDepts]= useState([]);
  const [archivedEngs, setArchivedEngs] = useState([]);
  const [projects,     setProjects]     = useState([]);
  const [candidates,   setCandidates]   = useState([]);
  const [kpiTargets,   setKpiTargets]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [kpiEditMode,  setKpiEditMode]  = useState(false);
  const [showTheme,    setShowTheme]    = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem("sier_theme");
      return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME;
    } catch { return DEFAULT_THEME; }
  });

  const handleThemeChange = (key, val) => {
    if (key === "_reset") {
      setTheme(DEFAULT_THEME);
      localStorage.removeItem("sier_theme");
      return;
    }
    const next = { ...theme, [key]: val };
    setTheme(next);
    try { localStorage.setItem("sier_theme", JSON.stringify(next)); } catch {}
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cos, depts, ls, hd, sp, st, kp, eng, aCos, aDepts, aEngs, proj, cands, kpiTgts] = await Promise.all([
      supabase.from("companies").select("*").order("sort_order").eq("is_archived", false),
      supabase.from("departments").select("*").order("sort_order").eq("is_archived", false),
      supabase.from("activity_logs").select("*").order("date", { ascending:false }),
      supabase.from("hearing_answers").select("*"),
      supabase.from("sales_process").select("*"),
      supabase.from("company_strategy").select("*"),
      supabase.from("key_persons").select("*").order("created_at"),
      supabase.from("engineers").select("*").order("start_date", { ascending:false }).eq("is_archived", false),
      supabase.from("companies").select("*").eq("is_archived", true).order("sort_order"),
      supabase.from("departments").select("*").eq("is_archived", true),
      supabase.from("engineers").select("*").eq("is_archived", true).order("start_date", { ascending:false }),
      supabase.from("projects").select("*").order("received_date", { ascending:false }),
      supabase.from("project_candidates").select("*").order("created_at"),
      supabase.from("kpi_targets").select("*").order("quarter"),
    ]);
    setCompanies(cos.data     || []);
    setDepartments(depts.data || []);
    setLogs(ls.data           || []);
    setHearingData(hd.data    || []);
    setSalesProcess(sp.data   || []);
    setStrategies(st.data     || []);
    setKeyPersons(kp.data     || []);
    setEngineers(eng.data     || []);
    setArchivedCos(aCos.data  || []);
    setArchivedDepts(aDepts.data || []);
    setArchivedEngs(aEngs.data   || []);
    setProjects(proj.data       || []);
    setCandidates(cands.data    || []);
    setKpiTargets(kpiTgts.data  || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel("all_changes")
      .on("postgres_changes", { event:"*", schema:"public" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  const saveLog = useCallback(async (form) => {
    const { partner_name, ...rest } = form;
    const data = {
      date:             rest.date,
      company:          rest.company,
      department:       rest.department,
      person:           rest.person,
      activity_type:    rest.activity_type,
      phase:            rest.phase,
      status:           rest.status,
      probability:      rest.probability,
      memo:             rest.memo + (partner_name ? "　面談相手: " + partner_name : ""),
      next_action:      rest.next_action,
      next_action_date: rest.next_action_date || null,
    };
    const { error } = await supabase.from("activity_logs").insert([data]);
    if (error) { console.error(error); return false; }

    // 「稼働開始」の場合、部署の稼働数を+1・engineersに追加
    if (rest.activity_type === "稼働開始" && rest.department) {
      const co = companies.find(c => c.name === rest.company);
      if (co) {
        const dept = departments.find(d => d.company_id === co.id && d.name === rest.department);
        if (dept) {
          // 部署の稼働数+1・開始月設定
          await supabase.from("departments").update({
            active_count: (dept.active_count || 0) + 1,
            start_month:  rest.date ? rest.date.slice(0, 7) : null,
          }).eq("id", dept.id);
          // engineers テーブルに稼働者を追加（partner_name を名前として使用）
          if (partner_name) {
            await supabase.from("engineers").insert([{
              company_id:    co.id,
              department_id: dept.id,
              name:          partner_name,
              start_date:    rest.date || null,
              status:        "稼働中",
              notes:         rest.memo || "",
            }]);
          }
        }
      }
    }

    await fetchAll();
    return true;
  }, [fetchAll, companies, departments]);

  const saveHearing = useCallback(async (coId, answers, checks) => {
    const rows = HEARING_ITEMS.map((_, idx) => ({
      company_id:coId, item_index:idx,
      answer:answers[idx]||"", is_completed:checks[idx]||false,
      updated_at:new Date().toISOString(),
    }));
    await supabase.from("hearing_answers").upsert(rows, { onConflict:"company_id,item_index" });
    await fetchAll();
  }, [fetchAll]);

  const TABS = [
    { id:"dashboard", icon:"📊", label:"ダッシュボード" },
    { id:"kpi",       icon:"🎯", label:"KGI・KPI進捗" },
    { id:"monthly",   icon:"📅", label:"月別アクション" },
    { id:"summary",   icon:"📋", label:"営業サマリー" },
    { id:"log",       icon:"📝", label:"活動ログ" },
    { id:"hearing",   icon:"🎧", label:"ヒアリングシート" },
    { id:"engineers", icon:"👥", label:"稼働者管理" },
    { id:"projects",  icon:"📁", label:"案件管理" },
    { id:"companies", icon:"🏢", label:"企業・部署管理" },
    { id:"strategy",  icon:"🗺", label:"営業戦略" },
  ];

  const kgiCurrent = engineers.filter(e=>e.status==="稼働中").length;
  const kgiPct     = pct(kgiCurrent, 60);

  const views = {
    dashboard: <Dashboard companies={companies} departments={departments} engineers={engineers} logs={logs} kpiTargets={kpiTargets} onRefresh={fetchAll} />,
    monthly:   <MonthlyActionsView />,
    kpi:       <KpiView   companies={companies} departments={departments} engineers={engineers} logs={logs} projects={projects} candidates={candidates} kpiTargets={kpiTargets} editMode={kpiEditMode} setEditMode={setKpiEditMode} onRefresh={fetchAll} />,
    summary:   <SummaryView companies={companies} salesProcess={salesProcess} onUpdateProcess={fetchAll} />,
    log:       <LogView   logs={logs} companies={companies} departments={departments} loading={loading} />,
    hearing:   <HearingView companies={companies} departments={departments} keyPersons={keyPersons} hearingData={hearingData} onSaveHearing={saveHearing} onSaveLog={saveLog} />,
    engineers: <EngineerView companies={companies} departments={departments} engineers={engineers} archivedEngs={archivedEngs} onRefresh={fetchAll} />,
    projects:  <ProjectView  companies={companies} departments={departments} projects={projects} candidates={candidates} onRefresh={fetchAll} />,
    companies: <CompanyManager companies={companies} departments={departments} engineers={engineers} keyPersons={keyPersons} archivedCos={archivedCos} archivedDepts={archivedDepts} onRefresh={fetchAll} />,
    strategy:  <StrategyView companies={companies} strategies={strategies} onRefresh={fetchAll} />,
  };

  return (
    <ThemeCtx.Provider value={theme}>
    <div style={{ ...S.app, background:theme.bgApp, color:theme.textPrimary, fontSize:theme.fontBase }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* サイドバー */}
      <div style={{ ...S.side, background:theme.bgSidebar, borderRight:"1px solid "+theme.border }}>
        <div style={{ padding:"16px 18px", borderBottom:"1px solid #334155" }}>
          <div style={{ fontSize:theme.fontLg, fontWeight:700, letterSpacing:"-0.5px", color:theme.textPrimary }}>SIerSales</div>
          <div style={{ fontSize:theme.fontXs, color:theme.textMuted, marginTop:2 }}>開拓営業管理システム</div>
          <div style={{ fontSize:9, color:"#475569", marginTop:4 }}>v{APP_VERSION}</div>
        </div>
        <div style={{ padding:"8px 0", flex:1, overflowY:"auto" }}>
          {[
            { section:"メイン", items:["dashboard","kpi","monthly","summary"] },
            { section:"活動管理", items:["log","hearing"] },
            { section:"人材管理", items:["engineers","projects"] },
            { section:"設定・管理", items:["companies","strategy"] },
          ].map(({ section, items }) => (
            <div key={section}>
              <div style={{ padding:"8px 16px 4px", fontSize:9, color:"#475569", textTransform:"uppercase", letterSpacing:"1px" }}>{section}</div>
              {items.map(id => {
                const t = TABS.find(t=>t.id===id);
                return (
                  <div key={id} onClick={() => setTab(id)}
                    style={{ padding:"9px 14px", borderRadius:8, margin:"1px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:theme.fontSm, color:tab===id?"#fff":theme.textSecondary, background:tab===id?`linear-gradient(135deg,${theme.accentBlue},${theme.accentPurple})`:"transparent", transition:"all .15s" }}>
                    <span style={{ fontSize:14, width:18, textAlign:"center" }}>{t?.icon}</span>
                    <span>{t?.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 16px", borderTop:"1px solid "+theme.border }}>
          <div style={{ fontSize:theme.fontXs, color:theme.textMuted, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>KGI達成まで</div>
          <div style={{ fontSize:theme.fontXl, fontWeight:700, color:theme.accentPurple }}>{60-kgiCurrent}件</div>
          <div style={{ height:3, background:theme.border, borderRadius:99, overflow:"hidden", marginTop:6 }}>
            <div style={{ width:`${kgiPct}%`, height:"100%", background:`linear-gradient(90deg,${theme.accentBlue},${theme.accentPurple})`, borderRadius:99 }} />
          </div>
          <button onClick={()=>setShowTheme(true)}
            style={{ marginTop:10, width:"100%", padding:"7px 0", background:theme.border, color:theme.textSecondary, border:"none", borderRadius:8, fontSize:12, cursor:"pointer", fontWeight:600 }}>
            🎨 テーマ設定
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={ S.main }>
        <div style={{ ...S.topbar, background:theme.bgTopbar, borderBottom:"1px solid "+theme.border }}>
          <div style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.3px" }}>
            {TABS.find(t=>t.id===tab)?.label}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>setShowModal(true)}
              style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>
              ＋ 活動を記録
            </button>
          </div>
        </div>
        <div style={{ padding:"20px 24px", flex:1 }}>
          {loading && tab !== "companies" ? <Spinner /> : views[tab]}
        </div>
      </div>

      {tab === "kpi" && (
        <button onClick={()=>setKpiEditMode(m=>!m)}
          style={{ position:"fixed", right:24, bottom:24, zIndex:50, padding:"10px 18px", borderRadius:99, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, boxShadow:"0 4px 14px rgba(0,0,0,0.35)", background:kpiEditMode?"#10b981":"#475569", color:"#fff" }}>
          {kpiEditMode ? "✓ 編集終了" : "✏️ 編集モード"}
        </button>
      )}

      {showModal && (
        <LogModal companies={companies} departments={departments} keyPersons={keyPersons} onClose={()=>setShowModal(false)} onSave={saveLog} />
      )}
      {showTheme && (
        <ThemePanel theme={theme} onChange={handleThemeChange} onClose={()=>setShowTheme(false)} />
      )}
    </div>
    </ThemeCtx.Provider>
  );
}
