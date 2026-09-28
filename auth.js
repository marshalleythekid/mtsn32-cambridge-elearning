/* Login pages: form behaviour. Front-end only for now. */
(() => {
  const $ = id => document.getElementById(id);

  /* ---------- Form ---------- */
  const form = $("loginForm");
  if (!form) return;
  const role = document.body.dataset.role;            // "student" | "teacher"
  const idInput = $("identifier"), pwInput = $("password");
  const idHelp = $("idHelp"), pwHelp = $("pwHelp"), count = $("idCount"), idOk = $("idOk");
  const submit = $("submitBtn"), alertBox = $("formAlert");
  const idDefault = idHelp.textContent, pwDefault = pwHelp.textContent;

  // Rules per role. A NISN is 10 digits; a NIP is 18 digits.
  const rules = {
    student: {
      clean: v => v.replace(/\D/g, "").slice(0, 10),
      check(v) {
        if (!v) return "Enter your NISN.";
        if (v.length !== 10) return `A NISN has 10 digits. You typed ${v.length}.`;
        return "";
      },
      counter: v => `${v.length}/10`,
    },
    teacher: {
      clean: v => /^[\d\s]+$/.test(v) ? v.replace(/\D/g, "").slice(0, 18) : v.trimStart(),
      check(v) {
        if (!v) return "Enter your NIP or school email.";
        if (/^\d+$/.test(v)) return v.length === 18 ? "" : `A NIP has 18 digits. You typed ${v.length}.`;
        if (v.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "That email looks incomplete. Check it has a name, @ and a domain.";
        return "Enter your 18-digit NIP, or an email with @.";
      },
      counter: v => /^\d+$/.test(v) ? `NIP ${v.length}/18` : v.includes("@") ? "Email" : "",
    },
  }[role];

  function setHelp(el, msg, fallback, input) {
    el.textContent = msg || fallback;
    el.classList.toggle("err", !!msg);
    input.setAttribute("aria-invalid", msg ? "true" : "false");
  }
  let touched = false;
  function updateId() {
    const cleaned = rules.clean(idInput.value);
    if (cleaned !== idInput.value) idInput.value = cleaned;
    const v = idInput.value.trim();
    idInput.classList.toggle("is-num", /^\d+$/.test(v));
    count.textContent = rules.counter(v);
    const ok = !rules.check(v);
    count.classList.toggle("done", ok);
    idOk.hidden = !ok;
    if (touched) setHelp(idHelp, rules.check(v), idDefault, idInput);
  }
  idInput.addEventListener("input", () => { alertBox.classList.remove("show"); updateId(); });
  idInput.addEventListener("blur", () => { if (idInput.value) { touched = true; updateId(); } });
  pwInput.addEventListener("input", () => { alertBox.classList.remove("show"); if (pwInput.getAttribute("aria-invalid") === "true") setHelp(pwHelp, "", pwDefault, pwInput); });
  pwInput.addEventListener("keyup", e => {
    if (pwInput.getAttribute("aria-invalid") === "true") return;
    pwHelp.textContent = e.getModifierState && e.getModifierState("CapsLock") ? "Caps Lock is on." : pwDefault;
  });

  // Show / hide password
  const eye = $("eye");
  eye.addEventListener("click", () => {
    const show = pwInput.type === "password";
    pwInput.type = show ? "text" : "password";
    eye.setAttribute("aria-pressed", show);
    eye.setAttribute("aria-label", show ? "Hide password" : "Show password");
    pwInput.focus();
  });

  // Help disclosures
  document.querySelectorAll(".help-q").forEach(q => q.addEventListener("click", () => {
    const open = q.getAttribute("aria-expanded") !== "true";
    q.setAttribute("aria-expanded", open);
    $(q.getAttribute("aria-controls")).hidden = !open;
  }));
  if (location.hash === "#forgot") $("forgotQ")?.click();

  /* Replace this with the real backend call later.
     Demo: any well-formed ID works; the password "wrong" shows the mismatch error. */
  function authenticate(id, password) {
    return new Promise(resolve => setTimeout(() => resolve(password !== "wrong"), 900));
  }

  const label = submit.innerHTML;
  function setState(s) {
    submit.dataset.state = s;
    submit.setAttribute("aria-disabled", s === "loading" || s === "success" ? "true" : "false");
    submit.innerHTML = s === "loading" ? '<span class="spinner" aria-hidden="true"></span>Checking…'
      : s === "success" ? '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg>Logged in'
      : label;
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (submit.dataset.state === "loading" || submit.dataset.state === "success") return;
    touched = true; updateId();
    const idErr = rules.check(idInput.value.trim());
    const pwErr = pwInput.value ? "" : "Enter your password.";
    setHelp(pwHelp, pwErr, pwDefault, pwInput);
    if (idErr || pwErr) { (idErr ? idInput : pwInput).focus(); return; }

    setState("loading");
    const ok = await authenticate(idInput.value.trim(), pwInput.value);
    if (!ok) {
      setState("idle");
      alertBox.classList.add("show");
      pwInput.value = ""; pwInput.focus();
      return;
    }
    setState("success");
    setTimeout(() => { location.href = "index.html"; }, 700);
  });
})();
