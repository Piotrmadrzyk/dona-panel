"""Generate the authenticated threaded-conversation API for the DONA panel."""
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
    ctor = "trigger" if kind == "webhook" else "node"
    NODES.append(f"const {var} = {ctor}({json.dumps(spec, ensure_ascii=False)});")


def condition(var, name, expression, expected):
    add(var, name, "if", 2.3, {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{
                "leftValue": expression,
                "rightValue": expected,
                "operator": {"type": "string", "operation": "equals"},
            }],
            "combinator": "and",
        }
    })


def table_get(var, name, table_id, conditions, limit=251):
    add(var, name, "dataTable", 1.1, {
        "resource": "row", "operation": "get",
        "dataTableId": {"__rl": True, "mode": "id", "value": table_id},
        "returnAll": False, "limit": limit, "matchType": "allConditions",
        "filters": {"conditions": conditions},
    }, executeOnce=True, alwaysOutputData=True)


def schema(values, types=None):
    types = types or {}
    return [{
        "id": key, "displayName": key, "type": types.get(key, "string"),
        "display": True, "required": False, "defaultMatch": False,
        "canBeUsedToMatch": True,
    } for key in values]


def table_write(var, name, table_id, operation, values, conditions=None, types=None):
    params = {
        "resource": "row", "operation": operation,
        "dataTableId": {"__rl": True, "mode": "id", "value": table_id},
        "columns": {"mappingMode": "defineBelow", "value": values, "schema": schema(values, types)},
    }
    if conditions:
        params.update({"matchType": "allConditions", "filters": {"conditions": conditions}})
    add(var, name, "dataTable", 1.1, params, executeOnce=True, alwaysOutputData=True)


THREADS = "ueqoYtgnkAMllvCK"
MESSAGES = "iBqaBoz7tY05KLDZ"
SECRET = "gtb2O8mzxTu0Wd2l"
cond = lambda key, value: {"keyName": key, "condition": "eq", "keyValue": value}

add("request", "Conversation Request", "webhook", 2.1, {
    "httpMethod": "POST", "path": "dona-panel-conversations", "responseMode": "responseNode",
    "options": {"allowedOrigins": "https://piotrmadrzyk.github.io,https://dona.probatum.pl"},
})
table_get("secret", "Panel Credential", SECRET, [cond("nazwa", "panel_haslo")], 2)
add("auth", "Validate Conversation Access", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-auth.js").read_text(),
})
add("access", "Authorized", "if", 2.3, {
    "conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
        "conditions": [{"leftValue": "={{ $json.authorized }}", "operator": {"type": "boolean", "operation": "true"}}],
        "combinator": "and",
    }
})
condition("isList", "List Threads", "={{ $json.operation }}", "list")
condition("isLoad", "Load Thread", "={{ $json.operation }}", "load")
condition("isCreate", "Create Thread", "={{ $json.operation }}", "create")

table_get("threads", "Read Conversation Threads", THREADS, [cond("tenant_id", "PM")], 51)
add("listResult", "Format Conversation List", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-list.js").read_text(),
})

table_get("loadThread", "Read Conversation Thread", THREADS, [
    cond("tenant_id", "PM"), cond("thread_id", "={{ $('Validate Conversation Access').first().json.threadId }}")
], 2)
table_get("messages", "Read Conversation Messages", MESSAGES, [
    cond("sesja", "={{ $('Validate Conversation Access').first().json.threadId }}")
], 251)
add("loadResult", "Format Loaded Conversation", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-load.js").read_text(),
})

add("buildThread", "Build New Thread", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-create.js").read_text(),
})
thread_values = {
    "tenant_id": "={{ $json.tenant_id }}", "thread_id": "={{ $json.thread_id }}",
    "title": "={{ $json.title }}", "brand_id": "={{ $json.brand_id }}",
    "created_at": "={{ $json.created_at }}", "updated_at": "={{ $json.updated_at }}",
    "message_count": "={{ $json.message_count }}", "archived": "={{ $json.archived }}",
}
table_write("insertThread", "Save New Thread", THREADS, "insert", thread_values,
            types={"created_at": "date", "updated_at": "date", "message_count": "number", "archived": "boolean"})
add("createdResult", "Format Created Conversation", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-created.js").read_text(),
})

table_get("appendThread", "Read Thread Before Append", THREADS, [
    cond("tenant_id", "PM"), cond("thread_id", "={{ $('Validate Conversation Access').first().json.threadId }}")
], 2)
add("buildMessage", "Build Conversation Message", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-append.js").read_text(),
})
add("messageValid", "Message Is Valid", "if", 2.3, {
    "conditions": {
        "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
        "conditions": [{"leftValue": "={{ $json.valid }}", "operator": {"type": "boolean", "operation": "true"}}],
        "combinator": "and",
    }
})
message_values = {
    "sesja": "={{ $json.thread_id }}", "rola": "={{ $json.role }}",
    "tresc": "={{ $json.content }}", "czas": "={{ $json.created_at }}",
    "wiadomosc_id": "={{ $json.message_id }}",
}
table_write("insertMessage", "Save Conversation Message", MESSAGES, "insert", message_values,
            types={"czas": "date"})
updated_values = {
    "title": "={{ $('Build Conversation Message').first().json.title }}",
    "brand_id": "={{ $('Build Conversation Message').first().json.brand_id }}",
    "updated_at": "={{ $('Build Conversation Message').first().json.created_at }}",
    "message_count": "={{ $('Build Conversation Message').first().json.message_count }}",
}
table_write("updateThread", "Update Thread Summary", THREADS, "update", updated_values, [
    cond("tenant_id", "PM"), cond("thread_id", "={{ $('Build Conversation Message').first().json.thread_id }}")
], types={"updated_at": "date", "message_count": "number"})
add("appendedResult", "Format Appended Conversation", "code", 2, {
    "mode": "runOnceForAllItems", "language": "javaScript",
    "jsCode": (ROOT / "backend/conversations-appended.js").read_text(),
})

headers = {"entries": [
    {"name": "Cache-Control", "value": "no-store"},
    {"name": "X-Content-Type-Options", "value": "nosniff"},
]}
def response(var, name, code="={{ $json.statusCode || 200 }}"):
    add(var, name, "respondToWebhook", 1.5, {
        "respondWith": "json", "responseBody": "={{ $json }}",
        "options": {"responseCode": code, "responseHeaders": headers},
    })

response("respondList", "Return Conversation List")
response("respondLoad", "Return Loaded Conversation")
response("respondCreate", "Return Created Conversation")
response("respondAppend", "Return Appended Conversation")
response("deny", "Return Conversation Error")

settings = {
    "executionOrder": "v1", "executionTimeout": 60,
    "saveDataErrorExecution": "none", "saveDataSuccessExecution": "none",
    "saveExecutionProgress": False, "saveManualExecutions": False,
    "timezone": "Europe/Warsaw", "callerPolicy": "workflowsFromSameOwner",
}
graph = """
export default workflow('dona-panel-conversations','DONA Panel — wątki rozmów',SETTINGS)
  .add(request).to(secret).to(auth).to(access)
  .add(access.output(0).to(isList))
  .add(access.output(1).to(deny))
  .add(isList.output(0).to(threads).to(listResult).to(respondList))
  .add(isList.output(1).to(isLoad))
  .add(isLoad.output(0).to(loadThread).to(messages).to(loadResult).to(respondLoad))
  .add(isLoad.output(1).to(isCreate))
  .add(isCreate.output(0).to(buildThread).to(insertThread).to(createdResult).to(respondCreate))
  .add(isCreate.output(1).to(appendThread).to(buildMessage).to(messageValid))
  .add(messageValid.output(0).to(insertMessage).to(updateThread).to(appendedResult).to(respondAppend))
  .add(messageValid.output(1).to(deny));
""".replace("SETTINGS", json.dumps({"settings": settings}, ensure_ascii=False))
source = "import { workflow, node, trigger } from '@n8n/workflow-sdk';\n" + "\n".join(NODES) + "\n" + graph
(ROOT / "backend/conversations.workflow.ts").write_text(source)
