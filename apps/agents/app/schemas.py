from pydantic import BaseModel


class AgentRunRequest(BaseModel):
    conversation_id: str
    message_id: str | None = None
    lead_id: str | None = None
    input_text: str | None = None


class AgentRunResponse(BaseModel):
    run_id: str
    status: str


class KnowledgeProcessRequest(BaseModel):
    file_id: str


class KnowledgeProcessResponse(BaseModel):
    file_id: str
    status: str


class AgentSandboxMessage(BaseModel):
    role: str
    content: str


class AgentSandboxRequest(BaseModel):
    messages: list[AgentSandboxMessage] = []
    input_text: str | None = None


class AgentSandboxResponse(BaseModel):
    status: str
    output: str | None = None
    model: str | None = None


class WebhookProcessRequest(BaseModel):
    event_id: str


class WebhookProcessResponse(BaseModel):
    event_id: str
    status: str


class WhatsappTemplateSyncRequest(BaseModel):
    workspace_id: str
    integration_account_id: str | None = None


class WhatsappTemplateSyncResponse(BaseModel):
    status: str
    templates: int = 0


class UazapiHistorySyncRequest(BaseModel):
    workspace_id: str
    integration_account_id: str


class UazapiHistorySyncResponse(BaseModel):
    status: str
    chats: int = 0
    messages: int = 0
