"""Generate the read-only DONA Live Ops n8n workflow from reviewable runtime modules."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODES = []


def add(var, name, kind, version, params, **settings):
    spec = {
        "type": "n8n-nodes-base." + kind,
        "version": version,
        "config": {"name": name, "parameters": params, **settings},
    }
    constructor = "trigger" if kind == "webhook" else "node"
    NODES.append(f"const {var} = {constructor}({json.dumps(spec, ensure_ascii=False)});")


def condition(field, value):
    return {"keyName": field, "condition": "eq", "keyValue": value}


def table(var, name, table_id, conditions, order_by, limit=251, notes="Tenant-scoped read only."):
    params = {
        "resource": "row", "operation": "get",
        "dataTableId": {"__rl": True, "mode": "id", "value": table_id},
        "returnAll": False, "limit": limit, "orderBy": True,
        "orderByColumn": order_by, "orderByDirection": "DESC",
    }
    if conditions:
        params.update({"matchType": "allConditions", "filters": {"conditions": conditions}})
    add(var, name, "dataTable", 1.1, params, executeOnce=True, alwaysOutputData=True, notes=notes)


add("request", "Live Ops Request", "webhook", 2.1, {
    "httpMethod": "POST", "path": "dona-live-ops", "responseMode": "responseNode",
    "options": {"allowedOrigins": "https://piotrmadrzyk.github.io,https://dona.probatum.pl"},
})
table("secret", "Panel Credential", "gtb2O8mzxTu0Wd2l", [condition("nazwa", "panel_haslo")], "createdAt", 2,
      "Fail-closed password lookup. No writes.")
add("auth", "Validate Live Ops Access", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/liveops-auth.js").read_text(),
})
add("access", "Authorized", "if", 2.3, {
    "conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
        "conditions": [{"leftValue": "={{ $json.authorized }}", "operator": {"type": "boolean", "operation": "true"}}],
        "combinator": "and",
    }
})

tenant = "={{ $('Validate Live Ops Access').first().json.tenantId }}"
table("agents", "Read Agent Logs", "WjTziChiMmtxWWlZ", [], "start", notes="Owner-only operational log. Build Snapshot exposes an explicit allowlist only. No writes.")
table("audit", "Read Incidents", "ejPSDcWeyryp3deZ", [condition("klient_id", tenant)], "czas")
table("costs", "Read Cost Audits", "ejPSDcWeyryp3deZ", [
    condition("klient_id", tenant), condition("agent", "PM Agent OS — OpenAI Cost Monitor"),
], "czas", 31,
      "Owner-only exact cost-monitor read. Build Snapshot additionally requires narzedzia=openai-costs-api and parses a strict JSON allowlist. No writes.")
table("models", "Read LLM Observability", "T8LCNWvmIZH9vjZJ", [condition("tenant_id", tenant)], "started_at")
table("approvals", "Read Approvals", "KGyAqpVVwhv7G0Ra", [condition("tenant_id", tenant)], "created_at", 51)
table("processes", "Read Processes", "gofNfnnyfk2JiaIT", [condition("tenant_id", tenant)], "ostatnia_aktywnosc", 101,
      "Tenant-scoped process read. Build Snapshot exposes sanitized status, step and result fields only. No writes.")
table("events", "Read Panel Events", "prNvnc22Kdu4GVQI", [condition("tenant_id", tenant)], "occurred_at", 101,
      "Tenant-scoped confirmation-event read. Build Snapshot exposes an explicit allowlist only. No writes.")
add("snapshot", "Build Live Ops Snapshot", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/liveops-snapshot.js").read_text(),
})

headers = {"entries": [
    {"name": "Cache-Control", "value": "no-store"},
    {"name": "X-Content-Type-Options", "value": "nosniff"},
]}
add("success", "Return Live Ops Snapshot", "respondToWebhook", 1.5, {
    "respondWith": "json", "responseBody": "={{ $json }}",
    "options": {"responseCode": 200, "responseHeaders": headers},
})
add("deny", "Return Live Ops Denied", "respondToWebhook", 1.5, {
    "respondWith": "json", "responseBody": "={{ {ok:false,error:$json.error} }}",
    "options": {"responseCode": "={{ $json.statusCode }}", "responseHeaders": headers},
})

settings = {
    "executionOrder": "v1", "executionTimeout": 60,
    "saveDataErrorExecution": "none", "saveDataSuccessExecution": "none",
    "saveExecutionProgress": False, "saveManualExecutions": False,
    "timezone": "Europe/Warsaw", "callerPolicy": "workflowsFromSameOwner",
}
graph = """
export default workflow('dona-live-ops','DONA Panel — Live Ops',SETTINGS)
  .add(request).to(secret).to(auth).to(access)
  .add(access.output(0).to(agents).to(audit).to(costs).to(models).to(approvals).to(processes).to(events).to(snapshot).to(success))
  .add(access.output(1).to(deny));
""".replace("SETTINGS", json.dumps({"settings": settings}, ensure_ascii=False))

source = "// Generated with python3 scripts/build-liveops.py. Runtime code lives in backend/liveops-*.js.\n"
source += "import { workflow, node, trigger } from '@n8n/workflow-sdk';\n"
source += "\n".join(NODES) + "\n" + graph
(ROOT / "backend/liveops.workflow.ts").write_text(source)
