"""Send one $5 sandbox invoice to the sandbox personal buyer, or check its status.
Usage: python spike/paypal_pay_test.py send <buyer_email>
       python spike/paypal_pay_test.py check <invoice_id>
"""
import base64, json, sys, urllib.request, urllib.error

env = {}
for l in open(r"D:/hackathons/paypal-ai/.env", encoding="utf-8-sig"):
    l = l.strip()
    if "=" in l and not l.startswith("#"):
        k, v = l.split("=", 1)
        env[k] = v.strip().strip('"')
API = "https://api-m.sandbox.paypal.com"


def call(method, path, body=None, token=None, basic=None):
    h = {"Content-Type": "application/json"}
    data = json.dumps(body).encode() if body is not None else None
    if basic:
        h = {"Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded"}
        data = b"grant_type=client_credentials"
    elif token:
        h["Authorization"] = "Bearer " + token
    req = urllib.request.Request(API + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            t = r.read().decode()
            return r.status, (json.loads(t) if t else {})
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try:
            return e.code, json.loads(t)
        except Exception:
            return e.code, {"raw": t[:300]}


b = base64.b64encode(f"{env['PAYPAL_CLIENT_ID']}:{env['PAYPAL_CLIENT_SECRET']}".encode()).decode()
T = call("POST", "/v1/oauth2/token", basic=b)[1]["access_token"]

if sys.argv[1] == "send":
    inv = {
        "detail": {"currency_code": "USD", "note": "DuesPilot sandbox payment test (fake money)",
                   "payment_term": {"term_type": "DUE_ON_RECEIPT"}},
        "invoicer": {"name": {"given_name": "DuesPilot", "surname": "Freelancer"}},
        "primary_recipients": [{"billing_info": {"email_address": sys.argv[2]}}],
        "items": [{"name": "Logo revisions (test)", "quantity": "1",
                   "unit_amount": {"currency_code": "USD", "value": "5.00"}}],
    }
    s, c = call("POST", "/v2/invoicing/invoices", inv, token=T)
    iid = c.get("href", "").rsplit("/", 1)[-1]
    print("create:", s, iid or c)
    s, snt = call("POST", f"/v2/invoicing/invoices/{iid}/send", {"send_to_invoicer": False, "send_to_recipient": True}, token=T)
    print("send:", s)
    s, g = call("GET", f"/v2/invoicing/invoices/{iid}", token=T)
    print("status:", g.get("status"), "| number:", g.get("detail", {}).get("invoice_number"))
    print("pay link:", g.get("detail", {}).get("metadata", {}).get("recipient_view_url"))
else:
    s, g = call("GET", f"/v2/invoicing/invoices/{sys.argv[2]}", token=T)
    print("status:", s, g.get("status"))
    p = g.get("payments", {})
    print("paid amount:", p.get("paid_amount"), "| transactions:",
          [(t.get("payment_id"), t.get("method"), t.get("amount", {}).get("value"), t.get("payment_date")) for t in p.get("transactions", [])])
