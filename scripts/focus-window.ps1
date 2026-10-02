param(
  [ValidateSet('Focus', 'Sample')]
  [string]$Action = 'Focus',
  [ValidateLength(1, 80)]
  [string]$TitlePattern,
  [ValidateSet('center', 'top-left', 'top-right', 'bottom-left', 'bottom-right')]
  [string]$ParkPosition = 'center',
  [switch]$ParkMouse,
  [switch]$ScrollAfterFocus,
  [ValidateSet('up', 'down')]
  [string]$ScrollDirection = 'down',
  [ValidateRange(1, 5)]
  [int]$ScrollTicks = 1
)

$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class NorthstarWindowApi
{
  [StructLayout(LayoutKind.Sequential)]
  public struct Point
  {
    public int X;
    public int Y;
  }

  [StructLayout(LayoutKind.Sequential)]
  public struct Rect
  {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

    public delegate bool EnumWindowsProc(IntPtr handle, IntPtr parameter);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr parameter);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr handle);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr handle, StringBuilder text, int maxCount);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr handle, int command);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr handle);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr handle, out Rect rectangle);

    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out Point point);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint flags, uint dx, uint dy, int data, UIntPtr extraInfo);

    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int index);
}
'@

$screenWidth = [NorthstarWindowApi]::GetSystemMetrics(0)
$screenHeight = [NorthstarWindowApi]::GetSystemMetrics(1)
$cursor = New-Object NorthstarWindowApi+Point
[void][NorthstarWindowApi]::GetCursorPos([ref]$cursor)
$parked = $false
$scrolled = 0

if ($Action -eq 'Sample') {
  @{
    success = $true
    x = $cursor.X
    y = $cursor.Y
    screenWidth = $screenWidth
    screenHeight = $screenHeight
    sampledAt = [DateTime]::UtcNow.ToString('o')
  } | ConvertTo-Json -Compress
  exit 0
}

if ([string]::IsNullOrWhiteSpace($TitlePattern)) {
  @{ success = $false; title = $null; message = 'A window title fragment is required.' } | ConvertTo-Json -Compress
  exit 2
}

$script:result = @{
  success = $false
  title = $null
  message = "No visible window title contains '$TitlePattern'. Open the app/window and check the title fragment."
  x = $cursor.X
  y = $cursor.Y
  screenWidth = $screenWidth
  screenHeight = $screenHeight
  cursorParked = $false
}

$callback = [NorthstarWindowApi+EnumWindowsProc] {
  param([IntPtr]$handle, [IntPtr]$parameter)

  if (-not [NorthstarWindowApi]::IsWindowVisible($handle)) {
    return $true
  }

  $text = New-Object System.Text.StringBuilder 512
  [void][NorthstarWindowApi]::GetWindowText($handle, $text, $text.Capacity)
  $title = $text.ToString()
  if ($title.Length -eq 0 -or $title.IndexOf($TitlePattern, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
    return $true
  }

  [void][NorthstarWindowApi]::ShowWindow($handle, 9)
  $focused = [NorthstarWindowApi]::SetForegroundWindow($handle)
  if ($focused -and $ParkMouse) {
    $margin = 12
    if ($ParkPosition -eq 'center') {
      $windowRect = New-Object NorthstarWindowApi+Rect
      [void][NorthstarWindowApi]::GetWindowRect($handle, [ref]$windowRect)
      $windowWidth = [Math]::Max(1, $windowRect.Right - $windowRect.Left)
      $windowHeight = [Math]::Max(1, $windowRect.Bottom - $windowRect.Top)
      $targetX = [Math]::Min($windowRect.Right - $margin, [int]($windowRect.Left + ($windowWidth * 0.65)))
      $targetY = [Math]::Min($windowRect.Bottom - $margin, [int]($windowRect.Top + ($windowHeight * 0.72)))
    } else {
      $targetX = if ($ParkPosition.EndsWith('right')) { $screenWidth - $margin } else { $margin }
      $targetY = if ($ParkPosition.StartsWith('bottom')) { $screenHeight - $margin } else { $margin }
    }
    $startX = $cursor.X
    $startY = $cursor.Y
    $steps = 18
    for ($step = 1; $step -le $steps; $step++) {
      $progress = $step / $steps
      $easedProgress = $progress * $progress * (3 - (2 * $progress))
      $x = [int]($startX + (($targetX - $startX) * $easedProgress))
      $y = [int]($startY + (($targetY - $startY) * $easedProgress))
      [void][NorthstarWindowApi]::SetCursorPos($x, $y)
      Start-Sleep -Milliseconds 16
    }
    $parked = $true
    [void][NorthstarWindowApi]::GetCursorPos([ref]$cursor)
  }
  if ($focused -and $ScrollAfterFocus) {
    $wheelDelta = if ($ScrollDirection -eq 'up') { 120 } else { -120 }
    for ($tick = 0; $tick -lt $ScrollTicks; $tick++) {
      [NorthstarWindowApi]::mouse_event(0x0800, 0, 0, $wheelDelta, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 120
      $scrolled++
    }
  }
  $script:result = @{
    success = [bool]$focused
    title = $title
    message = if ($focused) { "Focused '$title'." } else { "Found '$title', but Windows denied foreground focus. Try starting the monitor from the desktop session." }
    x = $cursor.X
    y = $cursor.Y
    screenWidth = $screenWidth
    screenHeight = $screenHeight
    cursorParked = [bool]$parked
    scrolledTicks = $scrolled
  }
  return $false
}

[void][NorthstarWindowApi]::EnumWindows($callback, [IntPtr]::Zero)
$script:result | ConvertTo-Json -Compress
