// Main.cs — StatMeter Panel (ASCII HUD in its own chat tab) + Kills/KPM
// C# 7.3 compatible. No XP/SK/AXP gain tracking or commands.
// Tracks: AAO, AAD, Crit+, XP% (boost only), +Damage(8), HP/Nano(now/max), ACs(8), Kills + KPM.

using System;
using System.Collections.Generic;
using AOSharp.Core;
using AOSharp.Core.UI;
using AOSharp.Common.GameData;

public class Main : AOPluginEntry
{
    // ===== Core =====
    private static bool _enabled;
    private static float _accum;
    private static float _intervalSec = 0.5f; // 500ms
    private static readonly Dictionary<string,int> _baseline = new Dictionary<string,int>(StringComparer.OrdinalIgnoreCase);
    private static readonly Dictionary<string,int> _lastSeen = new Dictionary<string,int>(StringComparer.OrdinalIgnoreCase);

    // ===== Panel (ASCII) =====
    private static bool _panelEnabled = true;
    private static readonly int _panelWidth = 64;
    private static float _hudTimer = 0f;
    private static int _hudPinSeconds = 5;
    private static ChatWindow _boundWindow; // set via /stat bindhere
    private static readonly Dictionary<string,int> _blinkLeft = new Dictionary<string,int>(StringComparer.OrdinalIgnoreCase);
    private const int _blinkCycles = 2;

    // ===== Tracked stats =====
    private static readonly string[] CoreStatNames = new string[] { "AddAllOff","AddAllDef","XPModifier","CriticalIncrease" };
    private static readonly string[] DmgStatNames  = new string[]
    {
        "ProjectileDamageModifier","MeleeDamageModifier","EnergyDamageModifier","ChemicalDamageModifier",
        "RadiationDamageModifier","ColdDamageModifier","FireDamageModifier","PoisonDamageModifier"
    };
    private static readonly Tuple<string,string>[] AcStats = new Tuple<string,string>[]
    {
        Tuple.Create("ProjectileAC","Proj"), Tuple.Create("MeleeAC","Melee"), Tuple.Create("EnergyAC","Energy"), Tuple.Create("ChemicalAC","Chem"),
        Tuple.Create("RadiationAC","Rad"),   Tuple.Create("ColdAC","Cold"),   Tuple.Create("FireAC","Fire"),     Tuple.Create("PoisonAC","Poison")
    };
    private static readonly string[] HpNowNames   = new string[] { "Life","Health","CurrentHealth" };
    private static readonly string[] HpMaxNames   = new string[] { "MaxHealth","LifeMax","MaxLife" };
    private static readonly string[] NanoNowNames = new string[] { "NanoEnergy","Nano","CurrentNano" };
    private static readonly string[] NanoMaxNames = new string[] { "MaxNanoEnergy","MaxNano","NanoMax" };
    private static readonly HashSet<string> _extra = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

    private static string _dmgMode = "nonzero"; // all | nonzero | max

    // ===== Watches =====
    private struct Watch { public string Op; public int Threshold; }
    private static readonly Dictionary<string, Watch> _watches = new Dictionary<string, Watch>(StringComparer.OrdinalIgnoreCase);

    private static int _killsTotal = 0;
    private static readonly List<double> _killTimes = new List<double>(512);
    private static int _lastExp = int.MinValue;
    private static int _lastSk  = int.MinValue;
    private static int _lastAxp = int.MinValue; // used ONLY for kill detection if aliens; not displayed
    private static readonly int _killWindowSec = 600;    // 10 minutes
    private static double _timeSeconds = 0.0;

    [Obsolete("AOSharp requires overriding an obsolete Run signature.")]
    public override void Run(string pluginDir)
    {
        InfoTo(null, "Loaded. " + Color("/stat on", "#91E6A8") + ", make a new chat tab, then " + Color("/stat bindhere", "#91E6A8") + ", and " + Color("/stat hudpin 5", "#9CD5FF"));

        Chat.RegisterCommand("stat", delegate(string cmd, string[] a, ChatWindow cw)
        {
            if (a.Length == 0) { HelpTo(cw); return; }
            string sub = a[0].ToLowerInvariant();

            // basics
            if (sub == "on") { _enabled = true; _accum = 0f; GoodTo(cw, "ON"); return; }
            if (sub == "off") { _enabled = false; WarnTo(cw, "OFF"); return; }
            if (sub == "baseline") { CaptureBaseline(); GoodTo(cw, "Baseline captured."); return; }
            if (sub == "interval")
            {
                int ms;
                if (a.Length>=2 && int.TryParse(a[1], out ms) && ms>=100 && ms<=5000) { _intervalSec = ms/1000f; GoodTo(cw, "Interval " + ms + " ms."); }
                else UsageTo(cw, "interval 500   (100–5000)");
                return;
            }

            // panel
            if (sub == "panel")
            {
                if (a.Length>=2)
                {
                    string v = a[1].ToLowerInvariant();
                    if (v == "on" || v == "1"){ _panelEnabled=true; GoodTo(cw, "Panel ON"); }
                    else if (v == "off" || v == "0"){ _panelEnabled=false; WarnTo(cw, "Panel OFF"); }
                    else UsageTo(cw, "panel on|off");
                }
                else InfoTo(cw, "Panel is " + (_panelEnabled?Color("ON","#91E6A8"):Color("OFF","#FFA07A")));
                return;
            }
            if (sub == "bindhere") { _boundWindow = cw; GoodTo(cw, "Panel bound to this chat tab."); return; }
            if (sub == "hudpin")
            {
                int s;
                if (a.Length>=2 && int.TryParse(a[1], out s) && s>=1 && s<=30) { _hudPinSeconds=s; GoodTo(cw, "Panel cadence " + s + "s."); }
                else UsageTo(cw, "hudpin 5   (1–30)");
                return;
            }
            if (sub == "dmgmode")
            {
                if (a.Length>=2)
                {
                    string m = a[1].ToLowerInvariant();
                    if (m == "all" || m == "nonzero" || m == "max"){ _dmgMode=m; GoodTo(cw, "dmgmode = " + m); }
                    else WarnTo(cw, "dmgmode: all | nonzero | max");
                }
                else WarnTo(cw, "dmgmode: all | nonzero | max");
                return;
            }

            // extras
            if (sub == "add"){ if(a.Length>=2){ if(IsValidStat(a[1])){_extra.Add(a[1]); GoodTo(cw, "Added "+a[1]);} else ErrTo(cw, "Unknown stat: "+a[1]); } else UsageTo(cw, "add <StatName>"); return; }
            if (sub == "remove"){ if(a.Length>=2){ if(_extra.Remove(a[1])) GoodTo(cw, "Removed "+a[1]); else WarnTo(cw, "Not found: "+a[1]); } else UsageTo(cw, "remove <StatName>"); return; }
            if (sub == "list"){ ListStatsTo(cw); return; }

            // watches
            if (sub == "watch")
            {
                if (a.Length>=4)
                {
                    string name=a[1], op=a[2]; int thr;
                    if (!IsValidStat(name)) { ErrTo(cw, "Unknown stat: " + name); return; }
                    if (!IsValidOp(op)) { ErrTo(cw, "Op must be one of >,>=,<,<=,==,!="); return; }
                    if (!int.TryParse(a[3], out thr)) { ErrTo(cw, "Threshold must be integer"); return; }
                    _watches[name]=new Watch{Op=op, Threshold=thr}; GoodTo(cw, "Watching "+name+" "+op+" "+thr);
                }
                else UsageTo(cw, "watch <Stat> <op> <n>");
                return;
            }
            if (sub == "unwatch"){ if(a.Length>=2){ if(_watches.Remove(a[1])) GoodTo(cw, "Unwatched "+a[1]); else WarnTo(cw, "No watch for "+a[1]); } else UsageTo(cw, "unwatch <Stat>"); return; }
            if (sub == "watches"){ ListWatchesTo(cw); return; }

            // fallback
            HelpTo(cw);
        });

        Game.OnUpdate += OnUpdate;
    }

    public override void Teardown()
    {
        Game.OnUpdate -= OnUpdate;
        InfoTo(null, "Unloaded.");
    }

    // ===== Update =====
    private static void OnUpdate(object s, float dt)
    {
        _timeSeconds += dt;

        if (_enabled)
        {
            _accum += dt;
            if (_accum >= _intervalSec)
            {
                _accum = 0f;
                try
                {
                    if (DynelManager.LocalPlayer == null) return;
                    Dictionary<string,int> snapshot = ReadTracked();

                    // blink on change
                    foreach (KeyValuePair<string,int> kv in snapshot)
                    {
                        int last;
                        if (!_lastSeen.TryGetValue(kv.Key, out last) || last != kv.Value)
                        {
                            _lastSeen[kv.Key] = kv.Value;
                            _blinkLeft[kv.Key] = _blinkCycles;
                        }
                    }

                    UpdateKills(snapshot);
                    EvaluateWatches(snapshot);
                }
                catch (Exception ex) { ErrTo(null, "Update error: " + ex.Message); }
            }
        }

        // Panel refresh
        if (_panelEnabled)
        {
            _hudTimer += dt;
            if (_hudTimer >= _hudPinSeconds)
            {
                _hudTimer = 0f;
                Dictionary<string,int> snap = ReadTracked();
                PrintPanel(snap);
                DecayBlinks();
            }
        }
    }

    private static void DecayBlinks()
    {
        List<string> keys = new List<string>(_blinkLeft.Keys);
        for (int i=0;i<keys.Count;i++)
        {
            int v=_blinkLeft[keys[i]];
            if (v>0) _blinkLeft[keys[i]] = v-1;
        }
    }

    private static Dictionary<string,int> ReadTracked()
    {
        Dictionary<string,int> d = new Dictionary<string,int>(StringComparer.OrdinalIgnoreCase);

        for (int i=0;i<CoreStatNames.Length;i++){ int v; if(TryReadStat(CoreStatNames[i], out v)) d[CoreStatNames[i]]=v; }
        for (int i=0;i<DmgStatNames.Length;i++){ int v; if(TryReadStat(DmgStatNames[i], out v)) d[DmgStatNames[i]]=v; }
        foreach (string name in _extra){ int v; if(TryReadStat(name,out v)) d[name]=v; }

        // HP/Nano candidates
        int hpNow,hpMax,npNow,npMax;
        if (TryReadAny(HpNowNames,out hpNow)) d["_HP_NOW"]=hpNow;
        if (TryReadAny(HpMaxNames,out hpMax)) d["_HP_MAX"]=hpMax;
        if (TryReadAny(NanoNowNames,out npNow)) d["_NP_NOW"]=npNow;
        if (TryReadAny(NanoMaxNames,out npMax)) d["_NP_MAX"]=npMax;

        // ACs
        for (int i=0;i<AcStats.Length;i++){ int v; if (TryReadStat(AcStats[i].Item1, out v)) d[AcStats[i].Item1]=v; }

        int tmp;
        if (TryReadStat("Experience", out tmp)) d["Experience"]=tmp;
        if (TryReadStat("ShadowKnowledge", out tmp)) d["ShadowKnowledge"]=tmp;
        if (TryReadStat("AlienExperience", out tmp)) d["AlienExperience"]=tmp;

        return d;
    }

    private static bool TryReadStat(string name, out int value)
    {
        value=0;
        try
        {
            Stat id;
            if(!Enum.TryParse(name, out id)) return false;
            if (DynelManager.LocalPlayer==null) return false;
            value = DynelManager.LocalPlayer.GetStat(id);
            return true;
        }
        catch { return false; }
    }
    private static bool TryReadAny(string[] names, out int value)
    {
        for (int i=0;i<names.Length;i++) if (TryReadStat(names[i], out value)) return true;
        value=0; return false;
    }

    private static void UpdateKills(Dictionary<string,int> snap)
    {
        bool killed = false;

        int v;
        if (snap.TryGetValue("Experience", out v))
        {
            if (_lastExp == int.MinValue) _lastExp = v;
            else if (v > _lastExp) { killed = true; _lastExp = v; }
            else _lastExp = v;
        }
        if (snap.TryGetValue("ShadowKnowledge", out v))
        {
            if (_lastSk == int.MinValue) _lastSk = v;
            else if (v > _lastSk) { killed = true; _lastSk = v; }
            else _lastSk = v;
        }
        if (snap.TryGetValue("AlienExperience", out v))
        {
            if (_lastAxp == int.MinValue) _lastAxp = v;
            else if (v > _lastAxp) { killed = true; _lastAxp = v; }
            else _lastAxp = v;
        }

        if (killed)
        {
            _killsTotal++;
            _killTimes.Add(_timeSeconds);

            double cutoff = _timeSeconds - _killWindowSec;
            int idx = 0;
            while (idx < _killTimes.Count && _killTimes[idx] < cutoff) idx++;
            if (idx > 0) _killTimes.RemoveRange(0, idx);
        }
    }

    private static double Kpm()
    {
        if (_killTimes.Count == 0) return 0;
        double window = Math.Min(_killWindowSec, Math.Max(1.0, _timeSeconds - _killTimes[0]));
        return (_killTimes.Count / window) * 60.0;
    }

    private static void EvaluateWatches(Dictionary<string,int> snap)
    {
        foreach (KeyValuePair<string,Watch> kv in _watches)
        {
            int cur;
            if (!snap.TryGetValue(kv.Key, out cur)) continue;
            if (Compare(cur, kv.Value.Op, kv.Value.Threshold))
                InfoTo(null, Color("WATCH ","#FFD700") + kv.Key + " " + kv.Value.Op + " " + kv.Value.Threshold + " hit (now " + cur + ")");
        }
    }
    private static bool Compare(int v, string op, int thr)
    {
        if (op == ">") return v>thr;
        if (op == ">=") return v>=thr;
        if (op == "<") return v<thr;
        if (op == "<=") return v<=thr;
        if (op == "==") return v==thr;
        if (op == "!=") return v!=thr;
        return false;
    }

    private static void CaptureBaseline()
    {
        _baseline.Clear();
        Dictionary<string,int> now = ReadTracked();
        foreach (KeyValuePair<string,int> kv in now) _baseline[kv.Key]=kv.Value;
    }
    private static string DeltaStr(string name, int current)
    {
        int baseVal;
        if (_baseline.TryGetValue(name, out baseVal))
        {
            int d=current-baseVal;
            if (d>0) return "+"+d;
            if (d<0) return d.ToString();
        }
        return "0";
    }

    private static void PrintPanel(Dictionary<string,int> snap)
    {
        List<string> lines = new List<string>();
        string title = " StatMeter ";
        string top = "+" + new string('-', _panelWidth-2) + "+";
        string midTitle = "|" + Center(title, _panelWidth-2) + "|";
        lines.Add(top);
        lines.Add(midTitle);
        lines.Add(top);

        // Core rows (includes XPModifier % as requested)
        lines.Add(Pad("| AAO " + CoreFmt(snap,"AddAllOff") + "   AAD " + CoreFmt(snap,"AddAllDef") + "   Crit+ " + CoreFmt(snap,"CriticalIncrease"), _panelWidth));
        lines.Add(Pad("| XP%  " + CoreFmt(snap,"XPModifier", "%"), _panelWidth));

        // HP/Nano
        lines.Add(Pad("| HP " + HpLine(snap) + "   Nano " + NanoLine(snap), _panelWidth));

        // ACs (two rows)
        lines.Add(Pad("| ACs  " + AcRow(snap, 0, 4), _panelWidth));
        lines.Add(Pad("|       " + AcRow(snap, 4, 4), _panelWidth));

        // +Damage
        lines.Add(Pad("| +Dmg " + DmgRow(snap), _panelWidth));

        if (_extra.Count>0)
        {
            List<string> parts = new List<string>();
            foreach (string name in _extra)
            {
                int v = GetOrMissing(snap, name); if (v==int.MinValue) v=0;
                parts.Add(name + ":" + v + "(" + DeltaStr(name, v) + ")");
            }
            lines.Add(Pad("| Extra " + string.Join("  ", parts.ToArray()), _panelWidth));
        }

        lines.Add(Pad("| Kills " + _killsTotal + "  | KPM " + Format1(Kpm()), _panelWidth));

        lines.Add(top);

        for (int i=0;i<lines.Count;i++) WritePanel(lines[i]);
    }

    private static string CoreFmt(Dictionary<string,int> snap, string name, string suffix = "")
    {
        int v=GetOrMissing(snap,name);
        if (v==int.MinValue) return "n/a";
        return Blink(name, v + suffix + " (" + DeltaStr(name, v) + ")");
    }
    private static string HpLine(Dictionary<string,int> snap)
    {
        int now=GetOrMissing(snap,"_HP_NOW"); if (now==int.MinValue) now=0;
        int max=GetOrMissing(snap,"_HP_MAX"); if (max==int.MinValue) max=0;
        return Blink("_HP_NOW", now+"/"+max);
    }
    private static string NanoLine(Dictionary<string,int> snap)
    {
        int now=GetOrMissing(snap,"_NP_NOW"); if (now==int.MinValue) now=0;
        int max=GetOrMissing(snap,"_NP_MAX"); if (max==int.MinValue) max=0;
        return Blink("_NP_NOW", now+"/"+max);
    }
    private static string AcRow(Dictionary<string,int> snap, int start, int count)
    {
        List<string> parts=new List<string>();
        for (int i=start;i<start+count && i<AcStats.Length;i++)
        {
            string stat=AcStats[i].Item1; string lab=AcStats[i].Item2;
            int v=GetOrMissing(snap, stat); if (v==int.MinValue) v=0;
            parts.Add(Blink(stat, lab+":"+Abbrev(v)));
        }
        return string.Join("  ", parts.ToArray());
    }
    private static string DmgRow(Dictionary<string,int> snap)
    {
        KeyValuePair<string,string>[] labels = new KeyValuePair<string,string>[]
        {
            new KeyValuePair<string,string>("ProjectileDamageModifier","Proj"),
            new KeyValuePair<string,string>("MeleeDamageModifier","Melee"),
            new KeyValuePair<string,string>("EnergyDamageModifier","Energy"),
            new KeyValuePair<string,string>("ChemicalDamageModifier","Chem"),
            new KeyValuePair<string,string>("RadiationDamageModifier","Rad"),
            new KeyValuePair<string,string>("ColdDamageModifier","Cold"),
            new KeyValuePair<string,string>("FireDamageModifier","Fire"),
            new KeyValuePair<string,string>("PoisonDamageModifier","Poison")
        };

        if (_dmgMode=="max")
        {
            string bestLab=""; int bestVal=0;
            for (int i=0;i<labels.Length;i++)
            {
                int v=GetOrMissing(snap, labels[i].Key); if (v==int.MinValue) v=0;
                if (v>bestVal){ bestVal=v; bestLab=labels[i].Value; }
            }
            return bestVal<=0 ? "[—]" : "["+bestLab+":"+bestVal+"]";
        }

        List<string> parts=new List<string>();
        for (int i=0;i<labels.Length;i++)
        {
            string k=labels[i].Key; string lab=labels[i].Value;
            int v=GetOrMissing(snap,k); if (v==int.MinValue) v=0;
            if (_dmgMode=="nonzero" && v==0) continue;
            parts.Add(Blink(k, lab+":"+v+"("+DeltaStr(k,v)+")"));
        }
        return parts.Count==0 ? "[—]" : "["+string.Join(" ", parts.ToArray())+"]";
    }

    private static string Center(string s, int inner)
    {
        if (s.Length>=inner) return s.Substring(0, inner);
        int pad=inner - s.Length, left=pad/2, right=pad-left;
        return new string(' ',left) + s + new string(' ',right);
    }
    private static string Pad(string s, int w)
    {
        if (s.Length>=w-1) return s.Substring(0,w-1) + "|";
        return s + new string(' ', (w-1)-s.Length) + "|";
    }
    private static string Blink(string name, string text)
    {
        int left;
        if (_blinkLeft.TryGetValue(name, out left) && left>0) return Color(text,"#FFD700");
        return text;
    }
    private static int GetOrMissing(Dictionary<string,int> d, string key){ int v; return d.TryGetValue(key,out v)?v:int.MinValue; }
    private static string Abbrev(double v)
    {
        double a=Math.Abs(v);
        if (a>=1000000) return Format1(v/1000000.0)+"m";
        if (a>=1000)     return Format1(v/1000.0)+"k";
        return Format1(v);
    }
    private static string Format1(double v)
    {
        string s=v.ToString("0.0", System.Globalization.CultureInfo.InvariantCulture);
        if (s.EndsWith(".0")) s = s.Substring(0, s.Length - 2);
        return s;
    }
    private static void WritePanel(string s)
    {
        try
        {
            if (_boundWindow != null) _boundWindow.WriteLine(s);
            else Chat.WriteLine(s);
        }
        catch { Chat.WriteLine(s); }
    }

    private static string Color(string txt, string hex){ return "<font color='" + hex + "'>" + txt + "</font>"; }
    private static void InfoTo(ChatWindow cw, string s){ WriteTo(cw, Color("[Stat][i] ","#9CD5FF") + s); }
    private static void GoodTo(ChatWindow cw, string s){ WriteTo(cw, Color("[Stat][✓] ","#91E6A8") + s); }
    private static void WarnTo(ChatWindow cw, string s){ WriteTo(cw, Color("[Stat][!] ","#FFA07A") + s); }
    private static void ErrTo(ChatWindow cw, string s){  WriteTo(cw, Color("[Stat][x] ","#FF6B6B") + s); }
    private static void UsageTo(ChatWindow cw, string s){ ErrTo(cw, "Usage: /stat " + s); }
    private static void WriteTo(ChatWindow cw, string s)
    {
        try
        {
            if (cw != null) cw.WriteLine(s);
            else if (_boundWindow != null) _boundWindow.WriteLine(s);
            else Chat.WriteLine(s);
        }
        catch { Chat.WriteLine(s); }
    }

    private static void HelpTo(ChatWindow cw)
    {
        WriteTo(cw, Color("[Stat] Commands","#9CD5FF"));
        InfoTo(cw, "/stat on|off, baseline, interval <ms>, dmgmode all|nonzero|max");
        InfoTo(cw, "/stat panel on|off, hudpin <sec>, bindhere");
        InfoTo(cw, "/stat add <Stat>, remove <Stat>, list");
        InfoTo(cw, "/stat watch <Stat> <op> <n>, unwatch <Stat>, watches");
        WarnTo(cw,  "Tip: create a dedicated chat tab, then /stat bindhere to isolate the panel.");
    }

    private static void ListStatsTo(ChatWindow cw)
    {
        WriteTo(cw, Color("[Stat] Tracked","#9CD5FF"));
        WriteTo(cw, "  AAO, AAD, Crit+, XP% (boost), +Damage(8), HP/Nano(now/max), ACs(8), Kills/KPM");
        if (_extra.Count==0) WriteTo(cw, "  Extra: (none)");
        else WriteTo(cw, "  Extra: " + string.Join(", ", _extra.ToArray()));
    }

    private static void ListWatchesTo(ChatWindow cw)
    {
        if (_watches.Count==0){ WriteTo(cw, Color("[Stat] Watches: (none)","#9CD5FF")); return; }
        WriteTo(cw, Color("[Stat] Watches","#9CD5FF"));
        foreach(KeyValuePair<string,Watch> kv in _watches) WriteTo(cw, "  " + kv.Key + " " + kv.Value.Op + " " + kv.Value.Threshold);
    }

    // ===== Helpers =====
    private static bool IsValidStat(string statName) { Stat _; return Enum.TryParse(statName, out _); }
    private static bool IsValidOp(string op)
    {
        return op == ">" || op == ">=" || op == "<" || op == "<=" || op == "==" || op == "!=";
    }
}
