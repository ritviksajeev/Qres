// QresDisplay - tiny Win32 display-mode CLI used by Qres.
//
// Qres compiles this file on first run with the csc.exe that ships inside
// Windows (%WINDIR%\Microsoft.NET\Framework64\v4.0.30319) and caches the result
// in %LOCALAPPDATA%\Qres\bin. No SDK, no native node module, no prebuilt
// binary in the repo - and every display call after that is a ~20 ms exec.
//
// Every command prints a single line of JSON on stdout.
//
//   list                  every attached display + its full mode table
//   cursor                the display the mouse is currently on
//   foreground            the display the focused window is on
//   set <args>            apply a mode
//   restore               drop every display back to its registry default
//
// set flags:
//   --display <\\.\DISPLAY1|auto|cursor|foreground|primary>
//   --width N --height N
//   --refresh <hz|max>    "max" = highest rate the display advertises for that
//                         resolution, which is what "keep default highest" means
//   --bpp N               defaults to whatever is in use
//   --volatile            apply for this session only (no registry write)
//   --test                validate the mode without applying it

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;

namespace Qres
{
    internal static class Native
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DEVMODE
        {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
            public ushort dmSpecVersion;
            public ushort dmDriverVersion;
            public ushort dmSize;
            public ushort dmDriverExtra;
            public uint dmFields;
            public int dmPositionX;
            public int dmPositionY;
            public uint dmDisplayOrientation;
            public uint dmDisplayFixedOutput;
            public short dmColor;
            public short dmDuplex;
            public short dmYResolution;
            public short dmTTOption;
            public short dmCollate;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
            public ushort dmLogPixels;
            public uint dmBitsPerPel;
            public uint dmPelsWidth;
            public uint dmPelsHeight;
            public uint dmDisplayFlags;
            public uint dmDisplayFrequency;
            public uint dmICMMethod;
            public uint dmICMIntent;
            public uint dmMediaType;
            public uint dmDitherType;
            public uint dmReserved1;
            public uint dmReserved2;
            public uint dmPanningWidth;
            public uint dmPanningHeight;
        }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct DISPLAY_DEVICE
        {
            public int cb;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]  public string DeviceName;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceString;
            public uint StateFlags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceID;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string DeviceKey;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT { public int X; public int Y; }

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public struct MONITORINFOEX
        {
            public int cbSize;
            public RECT rcMonitor;
            public RECT rcWork;
            public uint dwFlags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string szDevice;
        }

        public const uint DISPLAY_DEVICE_ATTACHED_TO_DESKTOP = 0x00000001;
        public const uint DISPLAY_DEVICE_PRIMARY_DEVICE      = 0x00000004;
        public const uint DISPLAY_DEVICE_MIRRORING_DRIVER    = 0x00000008;

        public const int ENUM_CURRENT_SETTINGS  = -1;
        public const int ENUM_REGISTRY_SETTINGS = -2;

        public const uint DM_POSITION           = 0x00000020;
        public const uint DM_BITSPERPEL         = 0x00040000;
        public const uint DM_PELSWIDTH          = 0x00080000;
        public const uint DM_PELSHEIGHT         = 0x00100000;
        public const uint DM_DISPLAYFREQUENCY   = 0x00400000;

        public const uint CDS_UPDATEREGISTRY = 0x00000001;
        public const uint CDS_TEST           = 0x00000002;
        public const uint CDS_FULLSCREEN     = 0x00000004;

        [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "EnumDisplayDevicesW")]
        public static extern bool EnumDisplayDevices(string lpDevice, uint iDevNum, ref DISPLAY_DEVICE lpDisplayDevice, uint dwFlags);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "EnumDisplaySettingsExW")]
        public static extern bool EnumDisplaySettingsEx(string lpszDeviceName, int iModeNum, ref DEVMODE lpDevMode, uint dwFlags);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "ChangeDisplaySettingsExW")]
        public static extern int ChangeDisplaySettingsEx(string lpszDeviceName, ref DEVMODE lpDevMode, IntPtr hwnd, uint dwflags, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "ChangeDisplaySettingsExW")]
        public static extern int ChangeDisplaySettingsExNull(string lpszDeviceName, IntPtr lpDevMode, IntPtr hwnd, uint dwflags, IntPtr lParam);

        [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
        [DllImport("user32.dll")] public static extern IntPtr MonitorFromPoint(POINT pt, uint dwFlags);
        [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);
        [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "GetMonitorInfoW")]
        public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFOEX lpmi);

        [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
        [DllImport("user32.dll")] public static extern bool SetProcessDpiAwarenessContext(IntPtr value);

        public const uint MONITOR_DEFAULTTONEAREST = 2;
    }

    // Just enough JSON to emit objects and arrays without pulling in a dependency.
    internal sealed class Json
    {
        private readonly StringBuilder _sb = new StringBuilder();
        private bool _needComma;

        public Json Obj()   { Sep(); _sb.Append('{'); _needComma = false; return this; }
        public Json EndObj(){ _sb.Append('}'); _needComma = true; return this; }
        public Json Arr()   { Sep(); _sb.Append('['); _needComma = false; return this; }
        public Json EndArr(){ _sb.Append(']'); _needComma = true; return this; }

        public Json Key(string k) { Sep(); Str(k); _sb.Append(':'); _needComma = false; return this; }
        public Json Val(string v) { Sep(); if (v == null) _sb.Append("null"); else Str(v); _needComma = true; return this; }
        public Json Val(long v)   { Sep(); _sb.Append(v.ToString(CultureInfo.InvariantCulture)); _needComma = true; return this; }
        public Json Val(bool v)   { Sep(); _sb.Append(v ? "true" : "false"); _needComma = true; return this; }

        public Json Raw(string json) { Sep(); _sb.Append(json); _needComma = true; return this; }

        public Json Prop(string k, string v) { return Key(k).Val(v); }
        public Json Prop(string k, long v)   { return Key(k).Val(v); }
        public Json Prop(string k, bool v)   { return Key(k).Val(v); }

        private void Sep() { if (_needComma) _sb.Append(','); }

        private void Str(string s)
        {
            _sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"':  _sb.Append("\\\""); break;
                    case '\\': _sb.Append("\\\\"); break;
                    case '\b': _sb.Append("\\b");  break;
                    case '\f': _sb.Append("\\f");  break;
                    case '\n': _sb.Append("\\n");  break;
                    case '\r': _sb.Append("\\r");  break;
                    case '\t': _sb.Append("\\t");  break;
                    default:
                        if (c < ' ' || c > '~') _sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        else _sb.Append(c);
                        break;
                }
            }
            _sb.Append('"');
        }

        public override string ToString() { return _sb.ToString(); }
    }

    internal sealed class Mode
    {
        public int Width, Height, Refresh, Bpp;
        public string Key { get { return Width + "x" + Height + "@" + Refresh + "/" + Bpp; } }
    }

    internal sealed class DisplayInfo
    {
        public string Id;           // \\.\DISPLAY1
        public string Adapter;      // "NVIDIA GeForce RTX 4070"
        public string Monitor;      // "LG ULTRAGEAR"
        public string MonitorId;    // MONITOR\GSM5B09\{4d36e96e-...}\0002
        public bool Primary;
        public int X, Y, Width, Height, Refresh, Bpp;
        public int Orientation;
        public List<Mode> Modes = new List<Mode>();
        public Mode Native;
    }

    public static class Program
    {
        public static int Main(string[] args)
        {
            MakeDpiAware();
            try
            {
                string cmd = args.Length > 0 ? args[0].ToLowerInvariant() : "list";
                switch (cmd)
                {
                    case "list":       return CmdList();
                    case "cursor":     return CmdPick(ResolveCursor());
                    case "foreground": return CmdPick(ResolveForeground());
                    case "set":        return CmdSet(args);
                    case "restore":    return CmdRestore();
                    default:
                        return Fail("unknown command: " + cmd);
                }
            }
            catch (Exception ex)
            {
                return Fail(ex.Message);
            }
        }

        private static void MakeDpiAware()
        {
            // Physical pixels everywhere, so cursor hit-testing lands on the right
            // monitor on mixed-DPI setups. V2 first, the old flag as a fallback.
            try { if (Native.SetProcessDpiAwarenessContext(new IntPtr(-4))) return; } catch { }
            try { Native.SetProcessDPIAware(); } catch { }
        }

        private static int Fail(string message)
        {
            Console.Out.Write(new Json().Obj().Prop("ok", false).Prop("error", message).EndObj().ToString());
            return 1;
        }

        // ---------- enumeration ----------

        private static List<DisplayInfo> Enumerate()
        {
            var result = new List<DisplayInfo>();

            for (uint i = 0; ; i++)
            {
                var adapter = new Native.DISPLAY_DEVICE();
                adapter.cb = Marshal.SizeOf(typeof(Native.DISPLAY_DEVICE));
                if (!Native.EnumDisplayDevices(null, i, ref adapter, 0)) break;

                bool attached  = (adapter.StateFlags & Native.DISPLAY_DEVICE_ATTACHED_TO_DESKTOP) != 0;
                bool mirroring = (adapter.StateFlags & Native.DISPLAY_DEVICE_MIRRORING_DRIVER) != 0;
                if (!attached || mirroring) continue;

                var info = new DisplayInfo
                {
                    Id = adapter.DeviceName,
                    Adapter = (adapter.DeviceString ?? "").Trim(),
                    Primary = (adapter.StateFlags & Native.DISPLAY_DEVICE_PRIMARY_DEVICE) != 0,
                    Monitor = MonitorName(adapter.DeviceName),
                    MonitorId = MonitorHardwareId(adapter.DeviceName),
                };

                var current = NewDevmode();
                if (Native.EnumDisplaySettingsEx(info.Id, Native.ENUM_CURRENT_SETTINGS, ref current, 0))
                {
                    info.X = current.dmPositionX;
                    info.Y = current.dmPositionY;
                    info.Width = (int)current.dmPelsWidth;
                    info.Height = (int)current.dmPelsHeight;
                    info.Refresh = (int)current.dmDisplayFrequency;
                    info.Bpp = (int)current.dmBitsPerPel;
                    info.Orientation = (int)current.dmDisplayOrientation;
                }

                CollectModes(info);
                result.Add(info);
            }

            return result;
        }

        private static string MonitorName(string adapterDeviceName)
        {
            var mon = new Native.DISPLAY_DEVICE();
            mon.cb = Marshal.SizeOf(typeof(Native.DISPLAY_DEVICE));
            if (Native.EnumDisplayDevices(adapterDeviceName, 0, ref mon, 0))
            {
                string name = (mon.DeviceString ?? "").Trim();
                if (name.Length > 0) return name;
            }
            return "Display";
        }

        private static string MonitorHardwareId(string adapterDeviceName)
        {
            var mon = new Native.DISPLAY_DEVICE();
            mon.cb = Marshal.SizeOf(typeof(Native.DISPLAY_DEVICE));
            if (Native.EnumDisplayDevices(adapterDeviceName, 0, ref mon, 0))
            {
                string id = (mon.DeviceID ?? "").Trim();
                if (id.Length > 0) return id;
            }
            return adapterDeviceName ?? "";
        }

        private static Native.DEVMODE NewDevmode()
        {
            var dm = new Native.DEVMODE();
            dm.dmDeviceName = string.Empty;
            dm.dmFormName = string.Empty;
            dm.dmSize = (ushort)Marshal.SizeOf(typeof(Native.DEVMODE));
            return dm;
        }

        private static void CollectModes(DisplayInfo info)
        {
            var seen = new Dictionary<string, Mode>();
            for (int n = 0; ; n++)
            {
                var dm = NewDevmode();
                if (!Native.EnumDisplaySettingsEx(info.Id, n, ref dm, 0)) break;

                // Interlaced and sub-8bpp modes are noise for this app's purpose.
                if (dm.dmBitsPerPel < 16) continue;

                var mode = new Mode
                {
                    Width = (int)dm.dmPelsWidth,
                    Height = (int)dm.dmPelsHeight,
                    Refresh = (int)dm.dmDisplayFrequency,
                    Bpp = (int)dm.dmBitsPerPel,
                };
                if (mode.Width <= 0 || mode.Height <= 0) continue;
                if (!seen.ContainsKey(mode.Key)) { seen[mode.Key] = mode; info.Modes.Add(mode); }
            }

            info.Modes.Sort(delegate (Mode a, Mode b)
            {
                if (a.Width != b.Width) return b.Width.CompareTo(a.Width);
                if (a.Height != b.Height) return b.Height.CompareTo(a.Height);
                return b.Refresh.CompareTo(a.Refresh);
            });

            // Windows has no "native resolution" API, so take the largest mode the
            // panel advertises - which is what it is on every real monitor.
            Mode native = null;
            foreach (var m in info.Modes)
            {
                if (native == null ||
                    (long)m.Width * m.Height > (long)native.Width * native.Height ||
                    ((long)m.Width * m.Height == (long)native.Width * native.Height && m.Refresh > native.Refresh))
                {
                    native = m;
                }
            }
            info.Native = native ?? new Mode { Width = info.Width, Height = info.Height, Refresh = info.Refresh, Bpp = info.Bpp };
        }

        // ---------- commands ----------

        private static int CmdList()
        {
            var displays = Enumerate();
            var j = new Json().Obj().Prop("ok", true).Key("displays").Arr();

            foreach (var d in displays)
            {
                j.Obj()
                 .Prop("id", d.Id)
                 .Prop("adapter", d.Adapter)
                 .Prop("monitor", d.Monitor)
                 .Prop("monitorId", d.MonitorId)
                 .Prop("primary", d.Primary)
                 .Prop("x", d.X).Prop("y", d.Y)
                 .Prop("width", d.Width).Prop("height", d.Height)
                 .Prop("refresh", d.Refresh).Prop("bpp", d.Bpp)
                 .Prop("orientation", d.Orientation)
                 .Key("native").Obj()
                     .Prop("width", d.Native.Width)
                     .Prop("height", d.Native.Height)
                     .Prop("refresh", d.Native.Refresh)
                 .EndObj()
                 .Key("modes").Arr();

                foreach (var m in d.Modes)
                {
                    j.Obj().Prop("width", m.Width).Prop("height", m.Height)
                           .Prop("refresh", m.Refresh).Prop("bpp", m.Bpp).EndObj();
                }

                j.EndArr().EndObj();
            }

            Console.Out.Write(j.EndArr().EndObj().ToString());
            return 0;
        }

        private static int CmdPick(string id)
        {
            Console.Out.Write(new Json().Obj().Prop("ok", true).Prop("id", id).EndObj().ToString());
            return 0;
        }

        private static string ResolveCursor()
        {
            Native.POINT pt;
            if (!Native.GetCursorPos(out pt)) return ResolvePrimary();
            return DeviceFromMonitor(Native.MonitorFromPoint(pt, Native.MONITOR_DEFAULTTONEAREST));
        }

        private static string ResolveForeground()
        {
            IntPtr hwnd = Native.GetForegroundWindow();
            if (hwnd == IntPtr.Zero) return ResolveCursor();
            return DeviceFromMonitor(Native.MonitorFromWindow(hwnd, Native.MONITOR_DEFAULTTONEAREST));
        }

        private static string DeviceFromMonitor(IntPtr hMonitor)
        {
            if (hMonitor == IntPtr.Zero) return ResolvePrimary();
            var mi = new Native.MONITORINFOEX();
            mi.cbSize = Marshal.SizeOf(typeof(Native.MONITORINFOEX));
            mi.szDevice = string.Empty;
            if (!Native.GetMonitorInfo(hMonitor, ref mi)) return ResolvePrimary();
            return string.IsNullOrEmpty(mi.szDevice) ? ResolvePrimary() : mi.szDevice;
        }

        private static string ResolvePrimary()
        {
            var all = Enumerate();
            foreach (var d in all) if (d.Primary) return d.Id;
            return all.Count > 0 ? all[0].Id : null;
        }

        private static int CmdSet(string[] args)
        {
            string target = "primary";
            int width = 0, height = 0, bpp = 0;
            string refresh = "max";
            bool volatileOnly = false, testOnly = false;

            for (int i = 1; i < args.Length; i++)
            {
                string a = args[i].ToLowerInvariant();
                switch (a)
                {
                    case "--display":  target = Next(args, ref i); break;
                    case "--width":    width = ParseInt(Next(args, ref i)); break;
                    case "--height":   height = ParseInt(Next(args, ref i)); break;
                    case "--refresh":  refresh = Next(args, ref i).ToLowerInvariant(); break;
                    case "--bpp":      bpp = ParseInt(Next(args, ref i)); break;
                    case "--volatile": volatileOnly = true; break;
                    case "--test":     testOnly = true; break;
                }
            }

            if (width <= 0 || height <= 0) return Fail("--width and --height are required");

            string id = ResolveTarget(target);
            if (string.IsNullOrEmpty(id)) return Fail("no display matched '" + target + "'");

            DisplayInfo info = null;
            foreach (var d in Enumerate()) if (string.Equals(d.Id, id, StringComparison.OrdinalIgnoreCase)) { info = d; break; }
            if (info == null) return Fail("display '" + id + "' is not attached");

            var previous = new Json().Obj()
                .Prop("width", info.Width).Prop("height", info.Height)
                .Prop("refresh", info.Refresh).Prop("bpp", info.Bpp).EndObj().ToString();

            int hz;
            if (refresh == "max" || refresh == "0" || refresh == "auto" || refresh == "default")
            {
                hz = HighestRefreshFor(info, width, height);
            }
            else
            {
                hz = ParseInt(refresh);
            }

            var dm = NewDevmode();
            if (!Native.EnumDisplaySettingsEx(id, Native.ENUM_CURRENT_SETTINGS, ref dm, 0))
                return Fail("could not read current settings for " + id);

            dm.dmPelsWidth = (uint)width;
            dm.dmPelsHeight = (uint)height;
            dm.dmFields = Native.DM_PELSWIDTH | Native.DM_PELSHEIGHT;

            if (hz > 0) { dm.dmDisplayFrequency = (uint)hz; dm.dmFields |= Native.DM_DISPLAYFREQUENCY; }
            if (bpp > 0) { dm.dmBitsPerPel = (uint)bpp; dm.dmFields |= Native.DM_BITSPERPEL; }

            int code = Native.ChangeDisplaySettingsEx(id, ref dm, IntPtr.Zero, Native.CDS_TEST, IntPtr.Zero);
            if (code != 0 && hz > 0)
            {
                // The rate was the only questionable part - retry letting Windows choose.
                dm.dmFields &= ~Native.DM_DISPLAYFREQUENCY;
                hz = 0;
                code = Native.ChangeDisplaySettingsEx(id, ref dm, IntPtr.Zero, Native.CDS_TEST, IntPtr.Zero);
            }
            if (code != 0) return Reply(false, id, width, height, hz, code, previous);

            if (testOnly) return Reply(true, id, width, height, hz, 0, previous);

            uint flags = volatileOnly ? Native.CDS_FULLSCREEN : Native.CDS_UPDATEREGISTRY;
            code = Native.ChangeDisplaySettingsEx(id, ref dm, IntPtr.Zero, flags, IntPtr.Zero);
            return Reply(code == 0 || code == 1, id, width, height, hz, code, previous);
        }

        private static int HighestRefreshFor(DisplayInfo info, int width, int height)
        {
            int best = 0;
            foreach (var m in info.Modes)
                if (m.Width == width && m.Height == height && m.Refresh > best) best = m.Refresh;
            return best;
        }

        private static int Reply(bool ok, string id, int w, int h, int hz, int code, string previousJson)
        {
            var j = new Json().Obj()
                .Prop("ok", ok)
                .Prop("id", id)
                .Prop("width", w).Prop("height", h).Prop("refresh", hz)
                .Prop("code", code)
                .Prop("message", Describe(code))
                .Key("previous").Raw(previousJson)
                .EndObj();
            Console.Out.Write(j.ToString());
            return ok ? 0 : 1;
        }

        private static string Describe(int code)
        {
            switch (code)
            {
                case  0: return "applied";
                case  1: return "applied, restart required to take full effect";
                case -1: return "the display driver rejected the change";
                case -2: return "this display does not support that mode";
                case -3: return "unable to write the mode to the registry";
                case -4: return "invalid flags";
                case -5: return "invalid parameters";
                case -6: return "the mode is not available in a dual-view setup";
                default: return "unknown result (" + code + ")";
            }
        }

        private static int CmdRestore()
        {
            int code = Native.ChangeDisplaySettingsExNull(null, IntPtr.Zero, IntPtr.Zero, 0, IntPtr.Zero);
            Console.Out.Write(new Json().Obj()
                .Prop("ok", code == 0 || code == 1)
                .Prop("code", code)
                .Prop("message", Describe(code))
                .EndObj().ToString());
            return (code == 0 || code == 1) ? 0 : 1;
        }

        private static string ResolveTarget(string target)
        {
            switch ((target ?? "").ToLowerInvariant())
            {
                case "":
                case "primary":    return ResolvePrimary();
                case "auto":
                case "cursor":     return ResolveCursor();
                case "foreground":
                case "active":     return ResolveForeground();
                default:           return target;
            }
        }

        private static string Next(string[] args, ref int i)
        {
            if (i + 1 >= args.Length) throw new ArgumentException("missing value after " + args[i]);
            return args[++i];
        }

        private static int ParseInt(string s)
        {
            int v;
            if (!int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out v))
                throw new ArgumentException("'" + s + "' is not a number");
            return v;
        }
    }
}
