// Insert JavaScript code to inject in windows.
// See documentation for examples.
setInterval(() => {
  if (window.location.href === "https://grafana.prod.crto.in/login") {
    const iframe = document.querySelector("#guest-app");
    if (!iframe) return;
    const login = iframe.contentWindow.document.querySelector(".login");
    if (!login) return;
    const user = login.querySelector("input[name='user']");
    const password = login.querySelector("input[name='password']");
    const submit = login.querySelector("button");
    if (!user || !password || !submit) return;
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    ).set;
    nativeInputValueSetter.call(user, "login");
    nativeInputValueSetter.call(password, "password");
    user.dispatchEvent(new Event("input", { bubbles: true }));
    password.dispatchEvent(new Event("input", { bubbles: true }));
    submit.dispatchEvent(new Event("click", { bubbles: true }));
  }
}, 1000);
