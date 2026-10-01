# 10.240.0.0/24 Subnet Design

> **Status:** Draft — placeholder content. Final technical prose is forthcoming.


Avoiding 172.x Docker and VMnet1/VMnet8 route collisions.

## Problem

Default pools overlap VMware adapters with Pool overlaps errors.

## Fix

A pinned /24 that routes cleanly in every supported environment.

---

*Part of the sentinel-matrix documentation set. See mkdocs.yml for navigation.*
