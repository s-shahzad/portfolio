# Universal NIDS Case Study Summary

Generated: 2026-03-25T14:15:00Z

## Recruiter-Friendly Overview

This project shows how I packaged a hybrid network intrusion detection workflow into a presentation-safe control layer without changing the detector itself. The system combines signature logic, anomaly detection, supervised ML, and fusion scoring so an analyst or reviewer can see why an alert mattered instead of staring at a raw packet capture.

## Why The Hybrid Design Matters

Signature engines are good at catching known bad patterns, but they miss novel behavior. Unsupervised anomaly logic helps surface outliers, but on its own it can generate more noise. A supervised model adds another opinion based on labeled patterns. Fusion logic then requires multiple signals to agree before a high-confidence decision is promoted.

That means the design is not "AI replacing security rules." It is layered evidence: deterministic rules, statistical deviation, model scoring, and bounded analyst review.

## Run Snapshot

- Run name: `validated-local-replay-2026-03`
- Flows: `509`
- Alerts: `10`
- Status: `ready`

## Noise Reduction Story

The baseline alert ratio is `0.0196`, which means the replay produced a small alert set relative to total flow volume. That is the story recruiters and hiring managers should care about: the system is not trying to alert on everything. It is trying to narrow a larger stream of traffic into a smaller review queue with stronger justification.

The fusion path is especially important here because it pushes the most convincing events upward while leaving weaker one-off signals lower in the queue.

## Engine Distribution

- fusion: 4
- signature: 3
- supervised: 2
- unsupervised: 1

## Severity Distribution

- high: 4
- medium: 3
- critical: 2
- low: 1

## AI Explanation

The explanation layer is assistive only. It summarizes stored run artifacts and alert samples so the page can communicate the outcome in plain language. It does not change thresholds, re-score traffic, or alter detection behavior. If Ollama is unavailable, the control layer falls back to deterministic explanation text instead of failing.

## Public Safety Notes

- This case-study bundle is static and presentation-safe.
- It omits localhost URLs, internal filesystem paths, and raw PCAP references.
- It represents exported analysis artifacts, not a live defensive control loop.
