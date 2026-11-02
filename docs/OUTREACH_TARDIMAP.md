# Tardimap outreach (Step 0)

The first step on the roadmap is to talk to the Tardimap consortium (see "The proposed next step" in the [README](../README.md)). This is the draft email for that conversation. It was written on 2026-11-02 and **has not been sent yet**. Byron sends it from his own account.

Status: draft, not sent. No warm contact known yet; contact@tardimap.org is the public address.

---


**To:** contact@tardimap.org
**Subject:** An open on-ramp for contributors to the tardigrade connectome

---

Hello Tardimap team,

I'm Byron, and I build open science tools under BioBitWorks. Your plan to map every neuron in *Hypsibius exemplaris* caught my attention, and I've built something that I hope can help get it finished.

The fruit fly connectome was completed in large part because hundreds of people, from lab scientists to citizen scientists, could learn the tools, pick up small proofreading tasks and get credit for their work. A whole-body nervous system of under 600 neurons seems small enough for the same community model to work.

So I built **Moss Piglet Play Pen**, an open, free tool meant as an on-ramp for contributors:

- Live demo: https://moss-piglets-play-pen.vercel.app
- Code: https://github.com/biobitworks/moss-piglets-play-pen (code under Apache-2.0)

It already includes:

- a progress view of what is reconstructed, proofread and typed, and what is left;
- a task board that breaks the remaining work into small jobs;
- training on finished, public connectome data, so newcomers learn before they touch real data;
- contributor credit and a roadmap page;
- a dataset browser and a chat assistant that need no API keys;
- connectors for Python, R and the command line, plus an MCP server for AI agents.

The tardigrade side currently runs on a **mock dataset**. I haven't used any Tardimap data, and I won't use any without your agreement.

To shape it around your real needs, could you help with a few questions?

1. **Pipeline:** what do you use for segmentation and proofreading (for example CAVE and Neuroglancer, webKnossos or CATMAID), and in what format is the Riker data stored?
2. **Contributors:** would you welcome outside contributors, now or later? If so, on what terms for data access, licensing, embargo and credit?
3. **Bottleneck:** which stage is slowest right now: proofreading, synapse detection, cell typing or something else?
4. **Reference material:** is there an annotated set of neurons or a cell-type guide that training tasks could be built from?

I'm also happy to run it just for your consortium, or to adapt it to your existing tools. A 20-minute call would be great if that's easier.

Thank you for making this an open project.

Best,
Byron
BioBitWorks
biobitworks@gmail.com
https://app.strangerbuilds.com/p/moss-piglet-play-pen
