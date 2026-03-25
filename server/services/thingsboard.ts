const TB_BASE_URL = "https://iot1.wsa.cloud/api";

export class TBError extends Error {
  constructor(public status: number, public statusText: string, message: string) {
    super(`${message}: ${status} ${statusText}`);
    this.name = "TBError";
  }
}

export class ThingsBoardService {
  private token: string;

  constructor(token: string) {
    this.token = token.startsWith("Bearer ") ? token.slice(7) : token;
  }

  private get headers() {
    return {
      "X-Authorization": `Bearer ${this.token}`,
      "Accept": "application/json",
      "Content-Type": "application/json"
    };
  }

  private async handleResponse(response: any, context: string) {
    if (!response.ok) throw new TBError(response.status, response.statusText, context);
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return {};
    }
  }

  async getUserInfo() {
    const response = await fetch(`${TB_BASE_URL}/auth/user`, { headers: this.headers });
    return this.handleResponse(response, "TB User Info Error");
  }

  async getAssets(pageSize = 100, page = 0, type?: string) {
    let url = `${TB_BASE_URL}/assetInfos/all?pageSize=${pageSize}&page=${page}`;
    if (type) url += `&type=${type}`;
    
    const response = await fetch(url, { headers: this.headers });
    return this.handleResponse(response, "TB Assets Error");
  }

  async getDevices(pageSize = 100, page = 0, type?: string) {
    let url = `${TB_BASE_URL}/deviceInfos/all?pageSize=${pageSize}&page=${page}`;
    if (type) url += `&type=${type}`;

    const response = await fetch(url, { headers: this.headers });
    return this.handleResponse(response, "TB Devices Error");
  }

  async getLatestTelemetry(entityType: string, entityId: string, keys?: string[]) {
    let url = `${TB_BASE_URL}/plugins/telemetry/${entityType}/${entityId}/values/timeseries`;
    if (keys && keys.length > 0) url += `?keys=${keys.join(",")}`;

    const response = await fetch(url, { headers: this.headers });
    return this.handleResponse(response, "TB Telemetry Error");
  }

  async getHistoricalTelemetry(entityType: string, entityId: string, keys: string[], startTs: number, endTs: number, limit = 1000) {
    const url = `${TB_BASE_URL}/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${keys.join(",")}&startTs=${startTs}&endTs=${endTs}&limit=${limit}`;
    const response = await fetch(url, { headers: this.headers });
    return this.handleResponse(response, "TB Historical Telemetry Error");
  }

  async getAttributes(entityType: string, entityId: string, scope: "SERVER_SCOPE" | "SHARED_SCOPE" | "CLIENT_SCOPE" = "SERVER_SCOPE") {
    const url = `${TB_BASE_URL}/plugins/telemetry/${entityType}/${entityId}/values/attributes/${scope}`;
    const response = await fetch(url, { headers: this.headers });
    return this.handleResponse(response, "TB Attributes Error");
  }

  async saveAsset(asset: { name: string; type: string; label?: string; additionalInfo?: any }) {
    const response = await fetch(`${TB_BASE_URL}/asset`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(asset)
    });
    return this.handleResponse(response, "TB Save Asset Error");
  }

  async saveRelation(relation: { from: any; to: any; type: string; typeGroup?: string }) {
    const response = await fetch(`${TB_BASE_URL}/relation`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(relation)
    });
    return this.handleResponse(response, "TB Save Relation Error");
  }

  async deleteRelation(fromId: string, fromType: string, toId: string, toType: string, relationType: string) {
    const url = `${TB_BASE_URL}/relation?fromId=${fromId}&fromType=${fromType}&relationType=${relationType}&toId=${toId}&toType=${toType}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.headers
    });
    return this.handleResponse(response, "TB Delete Relation Error");
  }

  async getRelations(entityType: string, entityId: string, direction: "FROM" | "TO" = "FROM") {
    const idParam = direction === "FROM" ? "fromId" : "toId";
    const typeParam = direction === "FROM" ? "fromType" : "toType";
    const url = `${TB_BASE_URL}/relations?${idParam}=${entityId}&${typeParam}=${entityType}`;
    const response = await fetch(url, { headers: this.headers });
    return this.handleResponse(response, "TB Get Relations Error");
  }
}
