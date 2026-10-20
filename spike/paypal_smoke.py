"""PayPal sandbox smoke: OAuth token, scopes, invoicing create->send->list, transaction search. Prints no secrets."""
import base64, json, os, time, urllib.request, urllib.error

env = {}
for l in open(r"D:/hackathons/paypal-ai/.env", encoding="utf-8-sig"):
    l = l.strip()
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1)
        env[k] = v.strip().strip('"')
API = "https://api-m.sandbox.paypal.com"


def call(method, path, body=None, token=None, basic=None, form=None):
    h = {"Content-Type": "application/json"}
    data = None
    if basic:
        h["Authorization"] = "Basic " + basic
        h["Content-Type"] = "application/x-www-form-urlencoded"
        data = form.encode()
    elif token:
        h["Authorization"] = "Bearer " + token
    if body is not None:
        data = json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else {})
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, {"raw": txt[:300]}


basic = base64.b64encode(f"{env['PAYPAL_CLIENT_ID']}:{env['PAYPAL_CLIENT_SECRET']}".encode()).decode()
s, tok = call("POST", "/v1/oauth2/token", basic=basic, form="grant_type=client_credentials")
print("1) OAuth:", s, "app_id" in tok and "ok" or tok.get("error_description", tok))
if s != 200:
    raise SystemExit(1)
T = tok["access_token"]
scopes = tok.get("scope", "")
for need in ["invoicing", "reporting/search", "disputes"]:
    print(f"   scope {need}:", "YES" if need in scopes else "no")

s, ui = call("GET", "/v1/identity/oauth2/userinfo?schema=paypalv1.1", token=T)
merchant_email = None
if s == 200:
    merchant_email = next((e["value"] for e in ui.get("emails", []) if e.get("primary")), None)
print("2) merchant (business) account:", s, merchant_email or ui.get("name") or ui.get("message", ""))

s, nxt = call("POST", "/v2/invoicing/generate-next-invoice-number", token=T)
print("3) next invoice number:", s, nxt.get("invoice_number", nxt.get("message", nxt)))

inv = {
    "detail": {"currency_code": "USD", "note": "DuesPilot sandbox smoke test", "payment_term": {"term_type": "NET_15"}},
    "invoicer": {"name": {"given_name": "DuesPilot", "surname": "Freelancer"}},
    "primary_recipients": [{"billing_info": {"email_address": "client-smoke@example.com"}}],
    "items": [{"name": "Design sprint (smoke test)", "quantity": "1", "unit_amount": {"currency_code": "USD", "value": "1.00"}}],
}
s, created = call("POST", "/v2/invoicing/invoices", inv, token=T)
href = created.get("href", "")
inv_id = href.rsplit("/", 1)[-1] if href else created.get("id")
print("4) create draft invoice:", s, inv_id or created.get("details", created)[:1] if isinstance(created.get("details"), list) else created.get("message", ""))
if inv_id:
    s, sent = call("POST", f"/v2/invoicing/invoices/{inv_id}/send", {"send_to_invoicer": False, "send_to_recipient": False}, token=T)
    print("5) send (no email):", s, sent.get("href", sent.get("message", ""))[:80] if isinstance(sent, dict) else "")
    s, got = call("GET", f"/v2/invoicing/invoices/{inv_id}", token=T)
    print("6) status:", s, got.get("status"), got.get("detail", {}).get("metadata", {}).get("recipient_view_url", "")[:70])
    s, _ = call("POST", f"/v2/invoicing/invoices/{inv_id}/cancel", {"send_to_invoicer": False, "send_to_recipient": False}, token=T)
    print("7) cancel smoke invoice:", s)

s, lst = call("GET", "/v2/invoicing/invoices?page_size=5&total_required=true", token=T)
print("8) list invoices:", s, "total", lst.get("total_items"))
end = time.strftime("%Y-%m-%dT%H:%M:%S-0000", time.gmtime())
start = time.strftime("%Y-%m-%dT%H:%M:%S-0000", time.gmtime(time.time() - 25 * 86400))
s, tx = call("GET", f"/v1/reporting/transactions?start_date={start}&end_date={end}&fields=all&page_size=5", token=T)
print("9) transaction search:", s, tx.get("total_items", tx.get("name", tx.get("message", ""))))
s, d = call("GET", "/v1/customer/disputes?page_size=5", token=T)
print("10) disputes list:", s, len(d.get("items", [])) if s == 200 else d.get("name", d.get("message", "")))
