# Corporation Edit Fix

## Problem
Konzern-Detail-Seite hatte 2 nicht-funktionale Bearbeiten-Buttons:
1. "Bearbeiten" (oben rechts) - keine onClick
2. "Details bearbeiten" (unten links) - keine onClick

## Lösung
- `CorporationDetailNew.tsx` komplett überarbeitet
- Edit-Dialog mit allen Feldern implementiert
- Oberer "Bearbeiten" Button funktional gemacht
- Unterer "Details bearbeiten" Button entfernt (redundant)
- tRPC `corporations.update` Mutation integriert

## Implementierung
- useState für Edit-Dialog und Form-Daten
- Dialog mit Input-Feldern: Name, Branche, Land, Website, LinkedIn, Status, Priorität, Notizen
- Mutation mit onSuccess Callback (Cache invalidieren, Dialog schließen)
- Button disabled während isPending

## Status
Code implementiert, Server-Neustart erforderlich für Test.

