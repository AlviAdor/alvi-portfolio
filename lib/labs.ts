/*
 * Pure logic for the defensive hands-on labs. No network access, no external
 * calls: everything runs in the browser against fixed sample data so a visitor
 * can get a feel for the concepts safely.
 *
 *  1. Firewall rule evaluator — writes allow/deny rules and watches which of a
 *     fixed set of sample packets a first-match filter would permit. This is a
 *     defensive teaching model of a stateless packet filter (think pf / iptables
 *     policy), not a tool that touches any real host.
 *  2. Confidence-threshold explorer — see lib/fer.ts; adjusts the decision
 *     threshold on a fixed model-output example.
 */

export type Protocol = "TCP" | "UDP" | "ICMP";
export type Action = "allow" | "deny";
export type Direction = "in" | "out";

export interface Packet {
  id: string;
  direction: Direction;
  protocol: Protocol;
  srcLabel: string;
  dstPort: number;
  /** Short human description key for messages (labs.firewall.packets.<id>). */
  descKey: string;
  /** Whether a sensible default-deny policy SHOULD permit this packet, for scoring hints. */
  shouldAllow: boolean;
}

export interface FirewallRule {
  id: string;
  action: Action;
  direction: Direction | "any";
  protocol: Protocol | "any";
  /** Port, or null for "any". */
  port: number | null;
}

/** Fixed sample traffic a learner evaluates their policy against. */
export const samplePackets: Packet[] = [
  { id: "p1", direction: "in", protocol: "TCP", srcLabel: "198.51.100.7", dstPort: 443, descKey: "https", shouldAllow: true },
  { id: "p2", direction: "in", protocol: "TCP", srcLabel: "203.0.113.9", dstPort: 22, descKey: "ssh", shouldAllow: false },
  { id: "p3", direction: "in", protocol: "TCP", srcLabel: "203.0.113.40", dstPort: 3389, descKey: "rdp", shouldAllow: false },
  { id: "p4", direction: "in", protocol: "UDP", srcLabel: "198.51.100.30", dstPort: 53, descKey: "dns", shouldAllow: true },
  { id: "p5", direction: "in", protocol: "TCP", srcLabel: "203.0.113.77", dstPort: 23, descKey: "telnet", shouldAllow: false },
  { id: "p6", direction: "out", protocol: "TCP", srcLabel: "app-server", dstPort: 443, descKey: "egress-https", shouldAllow: true },
  { id: "p7", direction: "in", protocol: "ICMP", srcLabel: "198.51.100.1", dstPort: 0, descKey: "ping", shouldAllow: true },
  { id: "p8", direction: "in", protocol: "TCP", srcLabel: "203.0.113.5", dstPort: 1433, descKey: "mssql", shouldAllow: false },
];

/** A reasonable starting policy the learner can edit. */
export const defaultRules: FirewallRule[] = [
  { id: "r1", action: "allow", direction: "in", protocol: "TCP", port: 443 },
  { id: "r2", action: "allow", direction: "in", protocol: "UDP", port: 53 },
  { id: "r3", action: "deny", direction: "in", protocol: "any", port: null },
];

const matches = (rule: FirewallRule, pkt: Packet): boolean =>
  (rule.direction === "any" || rule.direction === pkt.direction) &&
  (rule.protocol === "any" || rule.protocol === pkt.protocol) &&
  (rule.port === null || rule.port === pkt.dstPort);

export interface Verdict {
  packet: Packet;
  action: Action;
  /** Index of the rule that decided it, or -1 for the implicit default-deny. */
  ruleIndex: number;
  /** True when the decision agrees with a sane default-deny baseline. */
  aligned: boolean;
}

/** First-match evaluation with an implicit default-deny, like a real packet filter. */
export function evaluate(rules: FirewallRule[], packets: Packet[] = samplePackets): Verdict[] {
  return packets.map((packet) => {
    const idx = rules.findIndex((rule) => matches(rule, packet));
    const action: Action = idx === -1 ? "deny" : rules[idx]!.action;
    return { packet, action, ruleIndex: idx, aligned: (action === "allow") === packet.shouldAllow };
  });
}

export interface FirewallScore {
  verdicts: Verdict[];
  correct: number;
  total: number;
  /** Allowed something a default-deny baseline would block (worst kind of miss). */
  overExposed: number;
}

export function scorePolicy(rules: FirewallRule[]): FirewallScore {
  const verdicts = evaluate(rules);
  const correct = verdicts.filter((v) => v.aligned).length;
  const overExposed = verdicts.filter((v) => v.action === "allow" && !v.packet.shouldAllow).length;
  return { verdicts, correct, total: verdicts.length, overExposed };
}

export const protocols: Protocol[] = ["TCP", "UDP", "ICMP"];
export const commonPorts = [22, 23, 53, 80, 443, 1433, 3389];
