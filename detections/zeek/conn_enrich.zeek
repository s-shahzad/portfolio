##!  Connection Enrichment for Analyst Pivots
##!
##!  Author:  Azhad Shahzad Shaik
##!  Date:    2026-05-24
##!  Role:    Operator-side enrichment — written for analyst triage, not paging.
##!
##!  What this does:
##!    Tags conn.log records with three operator-friendly columns:
##!      - asset_role    : derived from local subnet zoning (user / server / mgmt / dmz)
##!      - dst_reputation: known-good / known-bad / unknown (in-memory list, replace
##!                        with Intel Framework feed in production)
##!      - flow_class    : "interactive" / "bulk" / "beaconish" / "trivial"
##!                        based on duration, byte counts, and packet count.
##!
##!  Why it ships with the rule library:
##!    Rules tell you what fired. Enrichment is what lets a Tier-1 analyst answer
##!    "is this real?" in under 30 seconds. Every detection in this repo is shaped
##!    to land in conn.log with these three columns already populated.

module DetectionEnrich;

export {
    redef record Conn::Info += {
        asset_role:     string &log &optional;
        dst_reputation: string &log &optional;
        flow_class:     string &log &optional;
    };

    # Per-environment tuning — replace with real zoning.
    const user_subnets:  set[subnet] = { 10.10.0.0/16 } &redef;
    const srv_subnets:   set[subnet] = { 10.20.0.0/16 } &redef;
    const mgmt_subnets:  set[subnet] = { 10.30.0.0/16 } &redef;
    const dmz_subnets:   set[subnet] = { 10.40.0.0/16 } &redef;

    # Toy reputation lists. In production this is the Intel Framework with a
    # threat-intel feed (MISP, VirusTotal premium, internal blocklist).
    const known_good:    set[addr]   = { 8.8.8.8, 1.1.1.1 } &redef;
    const known_bad:     set[addr]   = { } &redef;

    # Flow classifier thresholds (tuning levers).
    const beaconish_max_bytes:  count    = 4096      &redef;
    const beaconish_max_dur:    interval = 1 sec     &redef;
    const trivial_max_bytes:    count    = 256       &redef;
    const bulk_min_bytes:       count    = 1048576   &redef;   # 1 MiB
    const interactive_min_dur:  interval = 30 secs   &redef;
}

function classify_asset(host: addr): string {
    if ( host in user_subnets )  return "user";
    if ( host in srv_subnets )   return "server";
    if ( host in mgmt_subnets )  return "mgmt";
    if ( host in dmz_subnets )   return "dmz";
    return "external";
}

function classify_reputation(host: addr): string {
    if ( host in known_bad )     return "known-bad";
    if ( host in known_good )    return "known-good";
    return "unknown";
}

function classify_flow(c: connection): string {
    local total_bytes = (c$resp$num_bytes_ip + c$orig$num_bytes_ip);
    local dur         = c$duration;

    if ( dur <= beaconish_max_dur && total_bytes <= beaconish_max_bytes )
        return "beaconish";
    if ( total_bytes <= trivial_max_bytes )
        return "trivial";
    if ( total_bytes >= bulk_min_bytes )
        return "bulk";
    if ( dur >= interactive_min_dur )
        return "interactive";
    return "ordinary";
}

event connection_state_remove(c: connection) {
    c$conn$asset_role     = classify_asset(c$id$orig_h);
    c$conn$dst_reputation = classify_reputation(c$id$resp_h);
    c$conn$flow_class     = classify_flow(c);
}
