<#
.SYNOPSIS
  把 xhs-post 部署到 Claude Code 和 Codex 两侧的 skills 目录。

.DESCRIPTION
  两个 agent 读不同路径，本机没有生效的共用约定：
    Claude Code : %USERPROFILE%\.claude\skills\
    Codex       : $CODEX_HOME\skills\  （CODEX_HOME 默认 %USERPROFILE%\.codex）

  默认用**目录联接（junction）**指向本仓库，两边看到的是同一份文件：
    - 改仓库里的文件，两侧立刻生效，没有同步步骤，不会版本漂移
    - junction 在 Windows 上**不需要管理员权限**（符号链接才需要）
  用 -Copy 改为复制（跨盘、或目标环境不支持联接时用）。

.EXAMPLE
  .\install.ps1              # 联接到两侧
  .\install.ps1 -Copy        # 复制而非联接
  .\install.ps1 -Only codex  # 只装 Codex 侧
  .\install.ps1 -Uninstall   # 移除两侧
#>
[CmdletBinding()]
param(
  [switch]$Copy,
  [ValidateSet('both','claude','codex')][string]$Only = 'both',
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$Repo      = Split-Path -Parent $MyInvocation.MyCommand.Path
$SkillSrc  = Join-Path $Repo 'xhs-post'
$SkillName = 'xhs-post'

if (-not (Test-Path (Join-Path $SkillSrc 'SKILL.md'))) {
  throw "没找到 $SkillSrc\SKILL.md —— 请在仓库根目录运行本脚本。"
}

$codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
$targets = @()
if ($Only -in 'both','claude') { $targets += [pscustomobject]@{ Name='Claude Code'; Dir=Join-Path $env:USERPROFILE '.claude\skills' } }
if ($Only -in 'both','codex')  { $targets += [pscustomobject]@{ Name='Codex';       Dir=Join-Path $codexHome 'skills' } }

foreach ($t in $targets) {
  $dest = Join-Path $t.Dir $SkillName

  if (Test-Path $dest) {
    # 联接要用 Directory.Delete 才不会顺着链接删掉源文件
    $item = Get-Item $dest -Force
    if ($item.LinkType) { [System.IO.Directory]::Delete($dest, $false) }
    else { Remove-Item $dest -Recurse -Force }
    Write-Host "  移除旧的 $dest" -ForegroundColor DarkGray
  }
  if ($Uninstall) { Write-Host "$($t.Name): 已移除" -ForegroundColor Yellow; continue }

  if (-not (Test-Path $t.Dir)) { New-Item -ItemType Directory -Path $t.Dir -Force | Out-Null }

  if ($Copy) {
    Copy-Item $SkillSrc $dest -Recurse -Force
    Write-Host "$($t.Name): 已复制 -> $dest" -ForegroundColor Green
    Write-Host "  ⚠️ 复制是快照。改了仓库要重跑本脚本，否则两侧会漂移。" -ForegroundColor Yellow
  } else {
    New-Item -ItemType Junction -Path $dest -Target $SkillSrc | Out-Null
    Write-Host "$($t.Name): 已联接 -> $dest" -ForegroundColor Green
  }
}

if ($Uninstall) { return }

Write-Host ""
Write-Host "验证：" -ForegroundColor Cyan
foreach ($t in $targets) {
  $dest = Join-Path $t.Dir $SkillName
  $ok = Test-Path (Join-Path $dest 'SKILL.md')
  Write-Host ("  {0,-12} {1}  {2}" -f $t.Name, $(if($ok){'OK '}else{'失败'}), $dest)
}

Write-Host ""
Write-Host "⚠️ 出图工具链留在仓库里，不随 skill 走：" -ForegroundColor Yellow
Write-Host "   render_cards.mjs 依赖仓库根的 node_modules（playwright），"
Write-Host "   而 skills 目录下没有。渲染命令要在仓库根执行："
Write-Host "     cd $Repo" -ForegroundColor DarkGray
Write-Host "     node xhs-post/scripts/render_cards.mjs <模板> --data <数据> <输出目录>" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   本仓库路径已记录，SKILL.md 里引用它的地方按此为准：" -ForegroundColor DarkGray
Write-Host "     $Repo"
