# Detection Library

Production-style detections authored alongside the [Universal NIDS case study](../projects/nids/).
Each rule maps to one of the four hybrid engines used in that project — **signature**,
**anomaly**, **supervised**, **unsupervised** — and to the **fusion** stage that consolidates
agreeing signals before an alert is raised.

## Engine model

| Engine | What it does | Authoring style |
|---|---|---|
| `signature` | Deterministic IOC / rule match | Sigma, Suricata rules |
| `anomaly` | Statistical drift from baseline | SPL stddev / KQL `series_decompose_anomalies` |
| `supervised` | CatBoost classifier on labeled flows | Inline scores joined to alert pivots |
| `unsupervised` | IsolationForest on encoded flow features | Rare-pattern surfacing |
| `fusion` | Agreement count ≥ N across engines | Raise only when ≥2 engines agree on the entity |

The goal is not to ship every possible rule — it is to show how rules are **authored, tuned,
and tied to evidence**. Each detection below has the same shape: who/what it catches, the
evidence pivot an analyst should follow, and the MITRE ATT&CK technique it maps to.

## Rules

| File | Tactic / Technique | Engine | False-positive lever |
|---|---|---|---|
| [sigma/proc_susp_pwsh_b64.yml](sigma/proc_susp_pwsh_b64.yml) | T1059.001 PowerShell | supervised | Allowlist signed installer hashes |
| [sigma/net_dns_exfil_long_label.yml](sigma/net_dns_exfil_long_label.yml) | T1048.003 DNS exfil | unsupervised | Per-domain entropy floor |
| [sigma/net_c2_beacon_jitter.yml](sigma/net_c2_beacon_jitter.yml) | T1071.001 C2 beacon | fusion | Min agreeing engines = 2 |
| [sigma/auth_burst_5xx_fail.yml](sigma/auth_burst_5xx_fail.yml) | T1110.001 Brute force | signature | Per-source rate + identity-aware exempt list |
| [sigma/net_port_scan_syn.yml](sigma/net_port_scan_syn.yml) | T1046 Network scan | signature | Internal vuln-scanner CIDR allowlist |
| [splunk/beacon_interval_stddev.spl](splunk/beacon_interval_stddev.spl) | T1071 Beacon timing | anomaly | Min connection count, jitter window |
| [splunk/lateral_movement_chain.spl](splunk/lateral_movement_chain.spl) | T1021 Lateral movement | fusion | Time window + identity diversity threshold |
| [suricata/ua_anomaly.rules](suricata/ua_anomaly.rules) | T1071.001 Anomalous UA | signature | Per-UA fleet baseline |
| [zeek/conn_enrich.zeek](zeek/conn_enrich.zeek) | Pivot enrichment | — | N/A (analyst tool) |

## Tuning posture

These are written to be **noisy by default, quiet after one tuning pass**. The point is to
demonstrate that I've thought about the tuning lever, not to drop production-ready
allowlists for someone else's environment. Each rule documents the specific lever to tune
in the `falsepositives:` section (Sigma) or in a leading comment.

## How this connects to the NIDS case study

The [NIDS bundle](../projects/nids/) reports `engine_distribution` across signature,
supervised, unsupervised, and fusion engines. Every detection here is shaped to feed exactly
one of those engines. A fusion event in the live dashboard means **at least two of these
rule families fired on the same entity inside the agreement window** — that's the bar at
which an analyst is paged.
