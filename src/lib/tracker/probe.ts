// The Windows "probe": a small PowerShell loop that asks Windows, every few
// seconds, which app is in front and how long since the keyboard or mouse was
// last used. It prints one line of JSON per tick for the tracker to read.
//
// Privacy: the window title is only read for web browsers (to find the site
// name), and the tracker throws it away right after. For every other app,
// only the app's name is read.

/** Browser process names whose window title is read to find the site. */
export const BROWSERS = ["chrome", "msedge", "firefox", "brave", "opera", "vivaldi", "arc"];

export const PROBE_SCRIPT = String.raw`
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class QuestlineProbe {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int max);
  [StructLayout(LayoutKind.Sequential)] public struct LASTINPUTINFO { public uint cbSize; public uint dwTime; }
  [DllImport("user32.dll")] static extern bool GetLastInputInfo(ref LASTINPUTINFO info);
  public static uint IdleMilliseconds() {
    var info = new LASTINPUTINFO();
    info.cbSize = (uint)Marshal.SizeOf(info);
    GetLastInputInfo(ref info);
    return unchecked((uint)Environment.TickCount - info.dwTime);
  }
}
"@
$browsers = @(${BROWSERS.map((b) => `'${b}'`).join(",")})
$seconds = [int]$env:QUESTLINE_TICK_SECONDS
$parent = [int]$env:QUESTLINE_PARENT_PID
while ($true) {
  # Stop if Questline's server has gone away, so this loop never runs on its own.
  if (-not (Get-Process -Id $parent -ErrorAction SilentlyContinue)) { exit }
  $window = [QuestlineProbe]::GetForegroundWindow()
  $processId = [uint32]0
  [void][QuestlineProbe]::GetWindowThreadProcessId($window, [ref]$processId)
  $process = Get-Process -Id $processId
  $name = "$($process.ProcessName)"
  $title = ''
  if ($browsers -contains $name.ToLower()) {
    $buffer = New-Object System.Text.StringBuilder 512
    [void][QuestlineProbe]::GetWindowText($window, $buffer, 512)
    $title = $buffer.ToString()
  }
  $line = [pscustomobject]@{ process = $name; app = "$($process.Description)"; title = $title; idleMs = [QuestlineProbe]::IdleMilliseconds() } | ConvertTo-Json -Compress
  try { [Console]::Out.WriteLine($line); [Console]::Out.Flush() } catch { exit }
  Start-Sleep -Seconds $seconds
}
`;

/** PowerShell's -EncodedCommand takes the script as base64 of UTF-16LE text. */
export function encodedProbe() {
  return Buffer.from(PROBE_SCRIPT, "utf16le").toString("base64");
}
