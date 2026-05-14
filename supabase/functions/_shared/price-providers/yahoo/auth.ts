import { YAHOO_BROWSER_HEADERS } from "./constants.ts";

export async function getYahooCrumb(): Promise<{ crumb: string; cookie: string } | null> {
  try {
    const fcRes = await fetch("https://fc.yahoo.com", {
      headers: { ...YAHOO_BROWSER_HEADERS, "Accept": "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    const rawCookies = fcRes.headers.getSetCookie
      ? fcRes.headers.getSetCookie()
      : (fcRes.headers.get("set-cookie") ?? "").split(/,(?=[^;]+=[^;]+;)/);
    await fcRes.body?.cancel();
    const cookieStr = rawCookies.map((cookie: string) => cookie.split(";")[0].trim()).filter(Boolean).join("; ");
    if (!cookieStr) return null;

    const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...YAHOO_BROWSER_HEADERS, "Cookie": cookieStr },
    });
    if (!crumbRes.ok) {
      await crumbRes.body?.cancel();
      return null;
    }
    const crumb = (await crumbRes.text()).trim();
    if (!crumb || crumb.startsWith("<") || crumb.length > 20) return null;
    return { crumb, cookie: cookieStr };
  } catch (e) {
    console.log("crumb error:", String(e));
    return null;
  }
}
