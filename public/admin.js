const $ = id => document.getElementById(id);
async function api(url, options={}) {
  const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Request failed.");
  return d;
}
$("loginBtn").addEventListener("click", async () => {
  try {
    await api("/api/admin/login", { method:"POST", body:JSON.stringify({password:$("password").value}) });
    $("login").classList.add("hidden"); $("dashboard").classList.remove("hidden"); load();
  } catch(e) { $("loginMsg").textContent = e.message; }
});
async function load() {
  try {
    const d = await api("/api/admin/tickets");
    $("rows").innerHTML = d.tickets.map(t => `<tr><td>${t.code}</td><td>${new Date(t.createdAt).toLocaleString()}</td><td>${new Date(t.expiresAt).toLocaleString()}</td><td>${t.status}</td></tr>`).join("") || '<tr><td colspan="4">No visitor codes yet.</td></tr>';
  } catch(e) { $("verifyMsg").textContent = e.message; }
}
$("refresh").addEventListener("click", load);
$("verifyBtn").addEventListener("click", async () => {
  try {
    const d = await api("/api/admin/verify", { method:"POST", body:JSON.stringify({code:$("verifyCode").value}) });
    $("verifyMsg").textContent = d.message; $("verifyMsg").dataset.result = d.result; load();
  } catch(e) { $("verifyMsg").textContent = e.message; }
});
$("logout").addEventListener("click", async () => {
  try { await api("/api/admin/logout", {method:"POST"}); } catch {}
  $("dashboard").classList.add("hidden"); $("login").classList.remove("hidden"); $("password").value = "";
});
