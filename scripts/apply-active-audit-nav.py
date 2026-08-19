from pathlib import Path

p = Path('index.html')
s = p.read_text(encoding='utf-8')

old_nav = "nav.innerHTML=APP_TOOLS.map(t=>`<button class=\"${currentTool===t.id?'active':''}\" onclick=\"openTool('${t.id}')\">${t.icon} ${t.label}</button>`).join('');"
new_nav = "nav.innerHTML=APP_TOOLS.map(t=>`<button class=\"${currentTool===t.id?'active':''}\" onclick=\"${t.id==='audit'?'openSelectedClientAudit()':`openTool('${t.id}')`}\">${t.icon} ${t.label}</button>`).join('');"
if old_nav not in s:
    raise SystemExit('renderAppNav target not found')
s = s.replace(old_nav, new_nav, 1)

marker = "function openTool(id,quiet=false){"
helper = """async function openSelectedClientAudit(){
  if(activeWorkspaceClientId){
    await openClientWorkspace(activeWorkspaceClientId,'audit');
    return;
  }
  openTool('audit');
}
"""
if helper not in s:
    if marker not in s:
        raise SystemExit('openTool marker not found')
    s = s.replace(marker, helper + marker, 1)

old_card = "<button class=\"tool-card\" onclick=\"openTool('audit')\"><div class=\"tool-icon\">🔎</div><h2>Auditoría de campo</h2>"
new_card = "<button class=\"tool-card\" onclick=\"openSelectedClientAudit()\"><div class=\"tool-icon\">🔎</div><h2>Auditoría de campo</h2>"
if old_card in s:
    s = s.replace(old_card, new_card, 1)

p.write_text(s, encoding='utf-8')
