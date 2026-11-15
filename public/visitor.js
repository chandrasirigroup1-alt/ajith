const generate = document.getElementById("generate");
generate.addEventListener("click", async () => {
  generate.disabled = true;
  const msg = document.getElementById("message");
  msg.textContent = "Generating…";
  try {
    const r = await fetch("/api/tickets", { method: "POST" });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Could not generate code.");
    document.getElementById("code").textContent = data.code;
    document.getElementById("expiry").textContent = "Expires: " + new Date(data.expiresAt).toLocaleString();
    document.getElementById("result").classList.remove("hidden");
    msg.textContent = "Your code has been recorded in the admin dashboard.";
  } catch (e) { msg.textContent = e.message; }
  finally { generate.disabled = false; }
});
document.getElementById("copy").addEventListener("click", async () => {
  const code = document.getElementById("code").textContent;
  try { await navigator.clipboard.writeText(code); document.getElementById("message").textContent = "Code copied."; }
  catch { document.getElementById("message").textContent = "Please copy the code manually."; }
});