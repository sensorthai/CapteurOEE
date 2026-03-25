# 🧠 AI Context: OEE Dashboard (ThingsBoard Backend)

## 1. System Overview

You are working with an **OEE (Overall Equipment Effectiveness) Dashboard** project.

* Backend platform: **ThingsBoard**
* Server URL: http://iot1.wsa.cloud
* Architecture constraint: **No external database**
* All data (telemetry, attributes, calculations) must remain inside ThingsBoard
* for API access use https://iot1.wsa.cloud/swagger-ui/ to find best solutions
Your role is to assist with:

* Data modeling
* OEE calculations
* Dashboard design
* API usage
* Rule chain logic (if needed)

---

## 2. Core Constraints (IMPORTANT)

* ❌ Do NOT use external databases (MySQL, PostgreSQL, MongoDB, etc.)
* ❌ Do NOT suggest external analytics platforms
* ✅ Use only ThingsBoard features:

  * Telemetry
  * Attributes
  * Rule Chains
  * Dashboards
* ✅ Assume ThingsBoard is the single source of truth

---

## 3. OEE Definition

OEE is calculated as:

OEE = Availability × Performance × Quality

### Availability

Availability = Operating Time / Planned Production Time

### Performance

Performance = (Ideal Cycle Time × Total Count) / Operating Time

### Quality

Quality = Good Count / Total Count

---

## 4. Data Model (Telemetry)

Devices send telemetry to ThingsBoard using the following keys:

* status → "RUN" or "STOP"
* good_count → number of good units
* reject_count → number of defective units
* total_count → good_count + reject_count
* cycle_time → actual cycle time (seconds)
* planned_time → planned production time
* downtime → total downtime duration

All values are time-series telemetry.

---

## 5. Expected AI Behavior

When generating responses, you must:

### ✔ Follow These Rules

* Use ThingsBoard APIs and built-in capabilities
* Prefer real-time calculations over batch processing
* Keep solutions simple and practical
* Align with IoT telemetry-based architecture

### ✔ When Suggesting Solutions

* Provide ThingsBoard-compatible approaches
* Use:

  * Rule Chains for logic
  * Calculated fields where applicable
  * Dashboard widgets for visualization

### ❌ Avoid

* Suggesting external ETL pipelines
* Moving data outside ThingsBoard
* Complex microservice architectures

---

## 6. Example API Usage

HTTP Telemetry Upload:

POST /api/v1/{ACCESS_TOKEN}/telemetry

Example payload:
{
"status": "RUN",
"good_count": 100,
"reject_count": 3,
"cycle_time": 1.5
}

---

## 7. Dashboard Requirements

The dashboard should include:

* OEE (overall KPI)
* Availability, Performance, Quality breakdown
* Machine status (RUN/STOP)
* Production counts
* Downtime tracking
* Historical trends (time-series)
* Thai/English Switch
* Dark/Light Switch

---

## 8. Output Style Guidelines

* Be concise and technical
* Provide step-by-step instructions when needed
* Use structured formats (bullets, sections)
* Prefer practical implementation over theory

---

## 9. Optional Enhancements (If Asked)

* Predictive maintenance using telemetry trends
* Anomaly detection (within ThingsBoard capabilities)
* Multi-machine aggregation dashboards

---

## 10. Summary

This project is a **ThingsBoard-only OEE system**.

All recommendations must:

* Stay within ThingsBoard
* Use telemetry-driven logic
* Avoid external dependencies

## 11. Required Tech Stack 
Use this stack unless impossible:
* Framework: Next.js 16 (App Router) + React 19 + TypeScript. (Leveraging the stable React Compiler).
* AI Orchestration: Vercel AI SDK. (Essential for streaming LLM responses, tool calling, and handling UI states for AI).
* Styling: Tailwind CSS v4.0. (Using the high-performance Oxide engine and native container queries).
* Component System: shadcn/ui (Radix UI Primitives).
* Data Layer: TanStack Query v5 (Client-side sync) + Next.js use cache (Server-side caching).
* Data Grid: TanStack Table v8. (For complex logs, user lists, and analytics).
* Validation & Forms: Zod + React Hook Form. (Unified validation for client inputs and Server Actions).
---

## 12. Speed Optimization & Performance
To minimize dashboard lag and reduce server overhead, we shift from client-side processing to **Edge-calculated telemetry**.

* **Rule Engine Aggregation:** Use the **"Generator"** and **"Aggregate Latest"** nodes within ThingsBoard Rule Chains to pre-calculate OEE hourly/daily. This prevents the frontend from calculating $OEE = A \times P \times Q$ on thousands of raw data points.
* **Delta-Based Updates:** Devices should only push `status` changes (RUN/STOP) and incremental `counts`. The Rule Chain handles the accumulation to reduce MQTT/HTTP payload frequency.
* **TanStack Query + `use cache`:** * Use `staleTime: 30000` (30s) for telemetry to prevent redundant API polling.
    * Implement **Next.js Server Actions** with the `use cache` directive to memoize heavy ThingsBoard REST API calls (like entity searches) across users.

---

## 13. Background Tasks (Within ThingsBoard)
Since external workers are prohibited, use internal **Rule Chain Schedulers**:

* **Scheduled Reports:** Use the **"Scheduler"** event node to trigger a Rule Chain every shift end. This calculates total downtime and "Shift OEE" and saves it as a **Server-Side Attribute** for instant dashboard loading.
* **Data Retention Cleanup:** Configure the **"TTL" (Time to Live)** on telemetry keys to automatically purge raw high-frequency data (e.g., `cycle_time` per unit) while keeping aggregated OEE metrics indefinitely.
* **State Persistence:** Use the **"Originator Attributes"** node to track "Last State Change" timestamps. This allows the system to calculate downtime duration even if a device goes offline and reconnects.

---

## 14. Security Hardening
Protecting the IoT gateway and the dashboard interface without external middleware:

* **Device Access Tokens:** Never use a single "Provisioning Device" for all machines. Issue unique **Access Tokens** per machine and rotate them via the ThingsBoard API periodically.
* **XSS & CSRF Prevention:** * Leverage **Zod** to sanitize all inputs before sending `POST` requests to `/api/v1/{token}/telemetry`.
    * Use **Next.js Middleware** to validate JWT sessions from ThingsBoard before rendering protected dashboard routes.
* **Rate Limiting:** Enable ThingsBoard's internal **Tenant/Customer Limits** to prevent "noisy neighbor" devices from crashing the Rule Engine.
* **Attribute Scoping:** Store sensitive configuration (like `ideal_cycle_time`) in **Server-side Attributes** (invisible to the device) rather than Client-side Attributes to prevent machine tampering.

---
15. User Roles & Group Mapping
The system utilizes ThingsBoard's Entity-Based Permission model. This ensures that data isolation is handled at the API level—users only see telemetry for devices assigned to their specific Customer.

Hierarchy Structure
* Tenant Administrator: (System Level) Manages all Customers and global Rule Chains.
* Customer Administrator: (Management Level) Manages specific machine assets and creates/assigns Customer Users.
* Customer User: (Operator Level) Read-only or restricted access to OEE dashboards and specific machine telemetry.
+ User Group ""Operators""","Read-only Telemetry, View Dashboards",/api/customer/devices/*

