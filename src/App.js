import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

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
    <label style={S.label}>{label}</label>
    {children}
  </div>
);

const ModalWrap = ({ onClose, title, children, width=560 }) => (
  <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
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
const Dashboard = ({ companies, departments, logs }) => {
  const kgiTarget  = 60;
  const kgiCurrent = departments.reduce((s, d) => s + (d.active_count || 0), 0);
  const kgiPct     = pct(kgiCurrent, kgiTarget);

  const coWithDepts = companies.map(co => ({
    ...co,
    depts: departments.filter(d => d.company_id === co.id),
  }));

  return (
    <div>
      {/* KGIバー */}
      <div style={{ ...S.card, display:"flex", alignItems:"center", gap:16, marginBottom:16 }}>
        <div style={{ minWidth:100 }}>
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
          残り <strong style={{ color:"#f1f5f9" }}>{kgiTarget - kgiCurrent}件</strong><br />
          期限 2027年3月末
        </div>
      </div>

      {/* 企業別稼働人数 */}
      <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:10 }}>企業別 稼働人数</div>
      {coWithDepts.map(co => {
        const total = co.depts.reduce((s, d) => s + (d.active_count || 0), 0);
        return (
          <div key={co.id} style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: co.depts.length ? 10 : 0 }}>
              <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, background: prioBg(co.priority), color: prioColor(co.priority) }}>{co.priority}</span>
              <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{co.name}</span>
              <span style={{ fontSize:18, fontWeight:700, color:"#818cf8" }}>{total}<span style={{ fontSize:11, color:"#64748b" }}>名</span></span>
            </div>
            {co.depts.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {co.depts.map(d => (
                  <div key={d.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0 5px 16px", borderTop:"1px solid #334155" }}>
                    <div style={{ width:3, height:14, borderRadius:2, background:"#334155" }} />
                    <span style={{ flex:1, fontSize:12, color:"#94a3b8" }}>{d.name}</span>
                    <span style={{ fontSize:14, fontWeight:700, color: d.active_count > 0 ? "#10b981" : "#475569" }}>
                      {d.active_count || 0}<span style={{ fontSize:10, color:"#64748b" }}>名</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── KPI進捗 ─────────────────────────────────────────────────
const KpiView = ({ companies, departments, logs }) => {
  const QLABELS = ["Q1  2026年4〜6月","Q2  2026年7〜9月","Q3  2026年10〜12月","Q4  2027年1〜3月"];
  const QTHEMES = ["顧問連携確立・初回訪問","ヒアリング深化・提案開始","面談集中・クロージング加速","刈り取り・KGI達成"];
  const KPI_ROWS = [
    { name:"稼働件数",   tgts:[12,18,27,32] },
    { name:"面談実施数", tgts:[34,51,77,91] },
    { name:"候補提示数", tgts:[171,257,386,457] },
    { name:"顧問アポ数", tgts:[3,9,9,9] },
  ];
  const acts = [
    { 稼働件数: departments.reduce((s,d) => s+(d.active_count||0),0), 面談実施数: logs.filter(l=>l.activity_type==="面談実施").length, 候補提示数: logs.filter(l=>l.activity_type==="候補者提案").length, 顧問アポ数: logs.filter(l=>l.activity_type==="顧問からアポ取得").length },
    { 稼働件数:0, 面談実施数:0, 候補提示数:0, 顧問アポ数:0 },
    { 稼働件数:0, 面談実施数:0, 候補提示数:0, 顧問アポ数:0 },
    { 稼働件数:0, 面談実施数:0, 候補提示数:0, 顧問アポ数:0 },
  ];
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
            {KPI_ROWS.map(k => {
              const a = acts[qi][k.name] || 0;
              const p = pct(a, k.tgts[qi]);
              return (
                <div key={k.name} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                    <span style={{ color:"#94a3b8" }}>{k.name}</span>
                    <span style={{ fontWeight:700, color:pctColor(p) }}>{a} / {Math.round(k.tgts[qi])}</span>
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
      <div style={S.card}>
        <div style={{ fontSize:13, fontWeight:600, color:"#f1f5f9", marginBottom:14 }}>企業別 稼働目標</div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:"1px solid #334155" }}>
              {["企業名","優先度","Q1","Q2","Q3","Q4","通期","実績","達成率"].map(h => (
                <th key={h} style={{ padding:"7px 10px", color:"#64748b", fontWeight:600, textAlign:h==="企業名"?"left":"center", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map(co => {
              const act = departments.filter(d=>d.company_id===co.id).reduce((s,d)=>s+(d.active_count||0),0);
              const tgt = 9;
              const p = pct(act, tgt);
              return (
                <tr key={co.id} style={{ borderBottom:"1px solid #1e293b" }}>
                  <td style={{ padding:"8px 10px", color:"#f1f5f9", fontSize:11 }}>{co.name}</td>
                  <td style={{ textAlign:"center", padding:"8px 10px" }}>
                    <span style={{ fontSize:10, padding:"2px 6px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
                  </td>
                  <td style={{ textAlign:"center", padding:"8px 10px", color:"#475569" }}>─</td>
                  <td style={{ textAlign:"center", padding:"8px 10px", color:"#475569" }}>─</td>
                  <td style={{ textAlign:"center", padding:"8px 10px", color:"#475569" }}>─</td>
                  <td style={{ textAlign:"center", padding:"8px 10px", color:"#475569" }}>─</td>
                  <td style={{ textAlign:"center", padding:"8px 10px", fontWeight:700, color:"#f1f5f9" }}>{tgt}</td>
                  <td style={{ textAlign:"center", padding:"8px 10px", color:"#10b981", fontWeight:700 }}>{act}</td>
                  <td style={{ padding:"8px 10px", minWidth:80 }}>
                    <div style={{ height:4, background:"#334155", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ width:`${p}%`, height:"100%", background:p>=100?"#10b981":"#3b82f6", borderRadius:99 }} />
                    </div>
                    <div style={{ textAlign:"center", fontSize:9, color:"#64748b", marginTop:2 }}>{p}%</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
                      <div style={statusStyle(v)} onClick={() => cycleStatus(co.id, step)}>
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
  const [filterCo,   setFilterCo]   = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  const filteredLogs = logs.filter(l => {
    if (filterCo   !== "all" && l.company    !== filterCo)   return false;
    if (filterDept !== "all" && l.department !== filterDept) return false;
    return true;
  });

  const depts = filterCo === "all"
    ? departments
    : departments.filter(d => {
        const co = companies.find(c => c.name === filterCo);
        return co && d.company_id === co.id;
      });

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={S.label}>企業で絞り込み</label>
          <select value={filterCo} onChange={e => { setFilterCo(e.target.value); setFilterDept("all"); }}
            style={S.input}>
            <option value="all">全企業</option>
            {companies.map(c => <option key={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex:1, minWidth:160 }}>
          <label style={S.label}>部署で絞り込み</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={S.input}>
            <option value="all">全部署</option>
            {depts.map(d => <option key={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ fontSize:12, color:"#64748b", marginBottom:12 }}>{filteredLogs.length}件</div>
      {loading ? <Spinner /> : filteredLogs.map(l => (
        <div key={l.id} style={{ ...S.card, display:"flex", gap:14, padding:"12px 16px" }}>
          <div style={{ minWidth:50, fontSize:11, color:"#475569", paddingTop:2 }}>{l.date?.slice(5)}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <span style={{ fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{l.company}</span>
              {l.department && <span style={{ fontSize:11, color:"#64748b" }}>{l.department}</span>}
            </div>
            <div style={{ fontSize:12, color:"#94a3b8", marginBottom:2 }}>{l.activity_type}{l.person ? "  · " + l.person : ""}</div>
            {l.memo && <div style={{ fontSize:11, color:"#475569" }}>{l.memo}</div>}
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
};

// ── ヒアリングシート ────────────────────────────────────────
const HearingView = ({ companies, departments, hearingData, onSaveHearing, onSaveLog }) => {
  const [coId,    setCoId]    = useState(companies[0]?.id || "");
  const [answers, setAnswers] = useState({});
  const [checks,  setChecks]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [savedAsLog, setSavedAsLog] = useState(false);
  const [visitInfo, setVisitInfo] = useState({ date:"", person:"", partner:"", partner_dept:"" });

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
          <label style={S.label}>対象企業</label>
          <select value={coId} onChange={e => setCoId(e.target.value)} style={S.input}>
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
          {[["訪問日","date","date"],["担当営業","person","text"],["面談相手氏名","partner","text"],["面談相手の部署","partner_dept","text"]].map(([l,k,t]) => (
            <FormField key={k} label={l}>
              <input type={t} value={visitInfo[k]} onChange={e=>setVisitInfo(v=>({...v,[k]:e.target.value}))} style={S.input} placeholder={l} />
            </FormField>
          ))}
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
const CompanyManager = ({ companies, departments, onRefresh }) => {
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
    if (!window.confirm("この企業と関連データを全て削除しますか？")) return;
    await supabase.from("companies").delete().eq("id", id);
    onRefresh();
  };

  const addDept = async (coId) => {
    if (!newDeptName.trim()) return;
    await supabase.from("departments").insert([{ company_id:coId, name:newDeptName.trim(), active_count:0 }]);
    setNewDeptName(""); onRefresh();
  };

  const saveDept = async (dept) => {
    await supabase.from("departments").update({ name:dept.name, active_count:dept.active_count }).eq("id", dept.id);
    setEditDept(null); onRefresh();
  };

  const deleteDept = async (id) => {
    await supabase.from("departments").delete().eq("id", id);
    onRefresh();
  };

  const CoForm = ({ initial, onSave, onCancel }) => {
    const [form, setForm] = useState(initial);
    return (
      <div style={{ ...S.card, borderColor:"#2563eb" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
          <FormField label="企業名">
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={S.input} placeholder="企業名" />
          </FormField>
          <FormField label="優先度">
            <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={S.input}>
              {["最重要","重要","通常"].map(p=><option key={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="カテゴリ">
            <input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} style={S.input} placeholder="例: SI・クラウド" />
          </FormField>
          <FormField label="単価帯目安">
            <input value={form.unit_range} onChange={e=>setForm(f=>({...f,unit_range:e.target.value}))} style={S.input} placeholder="例: 60〜90万円/月" />
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
          <div key={co.id} style={S.card}>
            {editCo?.id === co.id ? (
              <CoForm initial={editCo} onSave={saveCo} onCancel={()=>setEditCo(null)} />
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:99, fontWeight:600, background:prioBg(co.priority), color:prioColor(co.priority) }}>{co.priority}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:600, color:"#f1f5f9" }}>{co.name}</span>
                  {co.category && <span style={{ fontSize:11, color:"#64748b" }}>{co.category}</span>}
                  {co.unit_range && <span style={{ fontSize:11, color:"#475569" }}>{co.unit_range}</span>}
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
                              <span style={{ fontSize:11, color:"#64748b" }}>稼働数</span>
                              <input type="number" min="0" value={editDept.active_count} onChange={e=>setEditDept(ed=>({...ed,active_count:parseInt(e.target.value)||0}))} style={{ ...S.input, width:60, padding:"4px 8px", fontSize:12, textAlign:"center" }} />
                            </div>
                            <button onClick={()=>saveDept(editDept)} style={{ ...S.btn, padding:"4px 10px", background:"#2563eb", color:"#fff", fontSize:11 }}>保存</button>
                            <button onClick={()=>setEditDept(null)} style={{ ...S.btn, padding:"4px 10px", background:"#334155", color:"#94a3b8", fontSize:11 }}>戻る</button>
                          </>
                        ) : (
                          <>
                            <span style={{ flex:1, fontSize:12, color:"#94a3b8" }}>{d.name}</span>
                            <span style={{ fontSize:14, fontWeight:700, color: d.active_count>0?"#10b981":"#475569" }}>{d.active_count||0}<span style={{ fontSize:10, color:"#64748b" }}>名</span></span>
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
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
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
          <label style={S.label}>企業を選択</label>
          <select value={selectedCo} onChange={e=>setSelectedCo(e.target.value)} style={S.input}>
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
          <div key={f.key} style={S.card}>
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
const LogModal = ({ companies, departments, onClose, onSave }) => {
  const [form, setForm] = useState({
    company:"", department:"", date:new Date().toISOString().slice(0,10),
    person:"", activity_type:"候補者提案", phase:"P3:提案・商談",
    status:"進行中", probability:"C（商談中）", memo:"", next_action:"",
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
    <ModalWrap onClose={onClose} title="活動を記録">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <FormField label="企業名">
          <select value={form.company} onChange={e=>update("company",e.target.value)} style={S.input}>
            <option value="">選択してください</option>
            {companies.map(c=><option key={c.id}>{c.name}</option>)}
          </select>
        </FormField>
        <FormField label="部署名">
          <select value={form.department} onChange={e=>update("department",e.target.value)} style={S.input}>
            <option value="">（未選択）</option>
            {depts.map(d=><option key={d.id}>{d.name}</option>)}
          </select>
        </FormField>
        <FormField label="活動日">
          <input type="date" value={form.date} onChange={e=>update("date",e.target.value)} style={S.input} />
        </FormField>
        <FormField label="担当者">
          <input value={form.person} onChange={e=>update("person",e.target.value)} placeholder="例: 益子" style={S.input} />
        </FormField>
        <FormField label="活動種別">
          <select value={form.activity_type} onChange={e=>update("activity_type",e.target.value)} style={S.input}>
            {ACT_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="フェーズ">
          <select value={form.phase} onChange={e=>update("phase",e.target.value)} style={S.input}>
            {PHASES.map(p=><option key={p}>{p}</option>)}
          </select>
        </FormField>
        <FormField label="ステータス">
          <select value={form.status} onChange={e=>update("status",e.target.value)} style={S.input}>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </FormField>
        <FormField label="受注確度">
          <select value={form.probability} onChange={e=>update("probability",e.target.value)} style={S.input}>
            {PROBS.map(p=><option key={p}>{p}</option>)}
          </select>
        </FormField>
      </div>
      <div style={{ marginTop:12 }}>
        <FormField label="活動内容・結果サマリー">
          <textarea value={form.memo} onChange={e=>update("memo",e.target.value)}
            placeholder="面談相手、話した内容、次のアクションにつながる情報など"
            style={{ ...S.input, resize:"vertical", minHeight:80 }} />
        </FormField>
      </div>
      <div style={{ marginTop:10 }}>
        <FormField label="次回アクション">
          <input value={form.next_action} onChange={e=>update("next_action",e.target.value)}
            placeholder="例: 候補者プロフィールを送付する" style={S.input} />
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

// ── メインアプリ ────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState("dashboard");
  const [companies,    setCompanies]    = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [logs,         setLogs]         = useState([]);
  const [hearingData,  setHearingData]  = useState([]);
  const [salesProcess, setSalesProcess] = useState([]);
  const [strategies,   setStrategies]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cos, depts, ls, hd, sp, st] = await Promise.all([
      supabase.from("companies").select("*").order("sort_order"),
      supabase.from("departments").select("*").order("sort_order"),
      supabase.from("activity_logs").select("*").order("date", { ascending:false }),
      supabase.from("hearing_answers").select("*"),
      supabase.from("sales_process").select("*"),
      supabase.from("company_strategy").select("*"),
    ]);
    setCompanies(cos.data   || []);
    setDepartments(depts.data || []);
    setLogs(ls.data         || []);
    setHearingData(hd.data  || []);
    setSalesProcess(sp.data || []);
    setStrategies(st.data   || []);
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
    const { error } = await supabase.from("activity_logs").insert([form]);
    if (error) { console.error(error); return false; }
    await fetchAll();
    return true;
  }, [fetchAll]);

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
    { id:"summary",   icon:"📋", label:"営業サマリー" },
    { id:"log",       icon:"📝", label:"活動ログ" },
    { id:"hearing",   icon:"🎧", label:"ヒアリングシート" },
    { id:"companies", icon:"🏢", label:"企業・部署管理" },
    { id:"strategy",  icon:"🗺", label:"営業戦略" },
  ];

  const kgiCurrent = departments.reduce((s,d)=>s+(d.active_count||0),0);
  const kgiPct     = pct(kgiCurrent, 60);

  const views = {
    dashboard: <Dashboard companies={companies} departments={departments} logs={logs} />,
    kpi:       <KpiView   companies={companies} departments={departments} logs={logs} />,
    summary:   <SummaryView companies={companies} salesProcess={salesProcess} onUpdateProcess={fetchAll} />,
    log:       <LogView   logs={logs} companies={companies} departments={departments} loading={loading} />,
    hearing:   <HearingView companies={companies} departments={departments} hearingData={hearingData} onSaveHearing={saveHearing} onSaveLog={saveLog} />,
    companies: <CompanyManager companies={companies} departments={departments} onRefresh={fetchAll} />,
    strategy:  <StrategyView companies={companies} strategies={strategies} onRefresh={fetchAll} />,
  };

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* サイドバー */}
      <div style={S.side}>
        <div style={{ padding:"16px 18px", borderBottom:"1px solid #334155" }}>
          <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.5px" }}>SIerSales</div>
          <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>開拓営業管理システム</div>
        </div>
        <div style={{ padding:"8px 0", flex:1, overflowY:"auto" }}>
          {[
            { section:"メイン", items:["dashboard","kpi","summary"] },
            { section:"活動管理", items:["log","hearing"] },
            { section:"設定・管理", items:["companies","strategy"] },
          ].map(({ section, items }) => (
            <div key={section}>
              <div style={{ padding:"8px 16px 4px", fontSize:9, color:"#475569", textTransform:"uppercase", letterSpacing:"1px" }}>{section}</div>
              {items.map(id => {
                const t = TABS.find(t=>t.id===id);
                return (
                  <div key={id} onClick={() => setTab(id)}
                    style={{ padding:"9px 14px", borderRadius:8, margin:"1px 8px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, fontSize:12, color:tab===id?"#fff":"#94a3b8", background:tab===id?"linear-gradient(135deg,#1d4ed8,#7c3aed)":"transparent", transition:"all .15s" }}>
                    <span style={{ fontSize:14, width:18, textAlign:"center" }}>{t?.icon}</span>
                    <span>{t?.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 16px", borderTop:"1px solid #334155" }}>
          <div style={{ fontSize:9, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>KGI達成まで</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#818cf8" }}>{60-kgiCurrent}件</div>
          <div style={{ height:3, background:"#334155", borderRadius:99, overflow:"hidden", marginTop:6 }}>
            <div style={{ width:`${kgiPct}%`, height:"100%", background:"linear-gradient(90deg,#3b82f6,#8b5cf6)", borderRadius:99 }} />
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.3px" }}>
            {TABS.find(t=>t.id===tab)?.label}
          </div>
          <button onClick={()=>setShowModal(true)}
            style={{ ...S.btn, background:"#2563eb", color:"#fff" }}>
            ＋ 活動を記録
          </button>
        </div>
        <div style={{ padding:"20px 24px", flex:1 }}>
          {loading && tab !== "companies" ? <Spinner /> : views[tab]}
        </div>
      </div>

      {showModal && (
        <LogModal companies={companies} departments={departments} onClose={()=>setShowModal(false)} onSave={saveLog} />
      )}
    </div>
  );
}
