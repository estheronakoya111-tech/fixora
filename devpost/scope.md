---
doc: scope
status: approved
---

# Fixora

Help people with confusing billing, payment, delivery, service, or account problems build a clear case, send a complaint with their own approval, and understand what to do after the company responds.

## The Unique Kernel
Fixora guides a person from a confusing billing story through the evidence and complaint, then helps them make sense of the company's reply. It reflects what it understands, asks clarifying questions when needed, explains why evidence may help, and lets the user correct or confirm the case before drafting. The user can edit and approve the complaint and keeps control of sending it.

## Who It's For
Someone with a billing or payment problem who believes something went wrong but is unsure how to explain it, what evidence matters, or what to do next. Examples include duplicate or incorrect charges, paying without receiving a service, charges after cancellation, or an unfamiliar charge.

## The Core Loop
The user describes the issue in their own words. Fixora reflects its understanding, asks clarifying questions when needed, explains what evidence could help and why, and lets the user correct or confirm the case before it drafts a complaint. The user reviews and edits it, then opens it in Gmail and sends it themselves. On return, Fixora asks whether they sent it; only confirmation moves the case to “Waiting for response.” For the hackathon demo, a simulated company reply triggers an in-app notification; opening it shows what the company said, what it means, what it did not address, and helps the user understand what they can do next. The user then picks the next step in order: mark the case resolved, ask Fixora for a short clarification email covering what the reply left unanswered (a simulated answer to that clarification comes back to the same case), or escalate with a formal letter that leads to a simulated final outcome.

## Inspiration & Identity
The product should feel calm, trustworthy, clear, and supportive rather than like a traditional customer-service portal. Detailed visual identity and interaction design will be defined during PRD. The idea began in a discussion with an AI agent; no specific app or project inspiration has been chosen.

## Why This Matters to the Learner
The learner wants to understand code sections, work effectively with a coding agent, and develop a better workflow. They want to understand project decisions instead of delegating the whole build.

## What “Working” Looks Like
A short demo shows someone describing one of the supported billing or payment problems, answering any needed clarifying questions, correcting or confirming Fixora's case summary, and adding relevant evidence after learning why it may help. Fixora drafts a complaint only after the user confirms the case. The user reviews and edits it, then opens it in Gmail to send. The user confirms sending in Fixora, the case enters “Waiting for response,” and a simulated company reply produces an in-app notification. Opening it leads to an explanation of the reply and helps the user understand what they can do next. The demo continues through the ordered next steps: Resolved, a drafted clarification email with its simulated answer returning to the case, or an escalation letter with a simulated final outcome.

## The POC Boundary
The hackathon proof of concept covers the small range of billing/payment issue types listed above through a shared guided case flow. Fixora reflects its understanding, asks clarifying questions when needed, explains why evidence may help, and waits for the user's correction or confirmation before drafting. The complaint is reviewable and editable, and opens in Gmail for the user to send. The case enters a waiting state only after the user confirms sending. A simulated incoming reply triggers an in-app notification and is analyzed in the case to help the user understand what they can do next. The post-reply flow is ordered: one choice per reply (Resolved, request clarification, or escalate), with one clarification round whose simulated answer replaces the evaluation, and one escalation whose simulated final outcome closes the loop. Fixora does not send the complaint, the clarification, or the escalation itself, and never claims to know that anything was sent.

## Later
Real Gmail reply monitoring, matching replies to cases, and notifying the user when a real company reply arrives. Direct Gmail sending may be explored later if it still preserves explicit user approval and control.

## Explicitly Cut
- Sending a complaint without the user's review and explicit approval. The user must keep final control of the recipient, message, and send action.
