from __future__ import annotations

from typing import Any, Dict, List, Optional
import threading


def _clean_none(d: Dict[str, Any]) -> Dict[str, Any]:
    """Return a shallow copy of d without None-valued keys."""
    return {k: v for k, v in d.items() if v is not None}


class Graph:
    """Thread-safe elements store for Cytoscape-compatible graphs."""

    def __init__(self) -> None:
        self._nodes: Dict[str, Dict[str, Any]] = {}
        self._edges: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def add_node(
        self,
        id_: str,
        label: str,
        type_: str,
        region: str,
        details: Optional[Dict[str, Any]] = None,
        parent: Optional[str] = None,
    ) -> None:
        """Add or update a node.

        - Ensures `group: "nodes"` so Cytoscape treats it as a node.
        - Merges details if node already exists.
        - Only sets `parent` if provided (avoids null).
        """
        if not id_:
            return

        with self._lock:
            if id_ in self._nodes:
                # Merge details and set parent if previously unset
                if details:
                    self._nodes[id_]["data"].setdefault("details", {}).update(details)
                if parent and not self._nodes[id_]["data"].get("parent"):
                    self._nodes[id_]["data"]["parent"] = parent
                # Keep label/type/region fresh if callers pass updated values
                self._nodes[id_]["data"]["label"] = label or self._nodes[id_]["data"].get("label", id_)
                self._nodes[id_]["data"]["type"] = type_ or self._nodes[id_]["data"].get("type")
                self._nodes[id_]["data"]["region"] = region or self._nodes[id_]["data"].get("region")
                return

            data = _clean_none(
                {
                    "id": id_,
                    "label": label or id_,
                    "type": type_,
                    "region": region,
                    "details": details or {},
                    "parent": parent,  # removed later if None by _clean_none
                }
            )
            self._nodes[id_] = {
                "group": "nodes",
                "data": data,
                # classes are optional but useful for styling/filtering later
                "classes": f"aws-node {type_}".strip(),
            }

    def add_edge(
        self,
        id_: str,
        src: str,
        tgt: str,
        label: str,
        type_: str,
        category: str,
        derived: bool = False,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Add an edge.

        - Ensures `group: "edges"` so Cytoscape treats it as an edge.
        - Stores `derived` as a string ("true"/"false") to match style selector edge[derived = "true"].
        """
        if not id_ or not src or not tgt:
            return

        with self._lock:
            if id_ in self._edges:
                return

            data = _clean_none(
                {
                    "id": id_,
                    "source": src,
                    "target": tgt,
                    "label": label,
                    "type": type_,
                    "category": category,
                    "derived": "true" if derived else "false",
                    "details": details or {},
                }
            )
            self._edges[id_] = {
                "group": "edges",
                "data": data,
                # include both category and type for flexible styling (e.g. resource-edge, network-edge)
                "classes": " ".join(
                    filter(
                        None,
                        [
                            f"{category}-edge" if category else None,
                            f"{type_}-edge" if type_ else None,
                        ],
                    )
                ),
            }

    def elements(self) -> List[Dict[str, Any]]:
        """Return a stable list of nodes then edges (safe to iterate multiple times)."""
        with self._lock:
            # return nodes first so compounds/parents exist before children
            return list(self._nodes.values()) + list(self._edges.values())
