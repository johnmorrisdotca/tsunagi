---
title: Upgrading and migrating records
section: upgrading
order: 10
description: Keep 1.x codes valid and apply a renumbering to old records once.
---

## Preserve the 1.x codes

Existing plain codes remain valid as walls, bridges, waypoints, wrapping, hexagons, portals and stroke/explosion rules are added through native suffixes. Use current decoders rather than assuming a code contains only cells. The 1.5 additions preserved existing levels up to 15×15 while adding larger boards and portals; 1.6 added layouts without answers.

## Migrate a documented renumbering

The renumbered entry records the historical old-to-new one-based level numbers by size, with TSUNAGI_RENUMBERED_AT identifying that migration. renumberedRecord applies the map to a stored record. Apply a migration once and keep its date/version; a repeated application is not an idempotent rewrite. Keep original board codes with solves rather than relying only on array positions.

## Keep integration behavior

Check representative plain/twist/progress records and both language paths. [CHANGELOG.md](../../CHANGELOG.md), [native embeds](../embeds.md) and [level loading](load-levels.md) retain compatibility details.
