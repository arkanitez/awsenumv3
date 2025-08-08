from __future__ import annotations
from typing import Any, Dict, List, Optional
import threading


def _clean_none(d: Dict[str, Any]) -> Dict[str, Any]:
    """Shallow copy without None values."""
    return {k: v for k, v in d.items() if v is not None}


class Graph:
    """Thread-safe Cytoscape-compatible graph."""

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
        icon: Optional[str] = None,
    ) -> None:
        """Add or update node, only include icon if supplied correctly."""
        if not id_:
            return

        with self._lock:
            node = self._nodes.get(id_)
            data = {
                "id": id_,
                "label": label or id_,
                "type": type_,
                "region": region,
                "details": details or {},
                "parent": parent,
            }
            if icon and isinstance(icon, str) and icon.strip():
                data["icon"] = icon

            clean = _clean_none(data)

            if node:
                node["data"].update(clean)
                return

            self._nodes[id_] = {
                "group": "nodes",
                "data": clean,
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
        """Add edge only if id/src/tgt are valid."""
        if not id_ or not src or not tgt:
            return

        with self._lock:
            if id_ in self._edges:
                self._edges[id_]["data"].setdefault("details", {}).update(details or {})
                return

            data = {
                "id": id_,
                "source": src,
                "target": tgt,
                "label": label,
                "type": type_,
                "category": category,
                "derived": "true" if derived else "false",
                "details": details or {},
            }

            clean = _clean_none(data)
            self._edges[id_] = {
                "group": "edges",
                "data": clean,
                "classes": " ".join(filter(None, [
                    f"{category}-edge" if category else None,
                    f"{type_}-edge" if type_ else None
                ]))
            }

    def elements(self) -> List[Dict[str, Any]]:
        """Return nodes then edges, filtering out invalid edges."""
        with self._lock:
            nodes = list(self._nodes.values())
            node_ids = set(self._nodes.keys())

            valid_edges = []
            for edge in self._edges.values():
                d = edge.get("data", {})
                src = d.get("source")
                tgt = d.get("target")
                if src in node_ids and tgt in node_ids:
                    valid_edges.append(edge)
            return nodes + valid_edges
