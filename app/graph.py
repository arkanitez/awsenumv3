from __future__ import annotations
from typing import Any, Dict, List, Optional
import threading

class Graph:
    """Thread-safe elements store for Cytoscape/Sigma-compatible graphs."""
    def __init__(self) -> None:
        self._nodes: Dict[str, Dict[str, Any]] = {}
        self._edges: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def add_node(self, id_: str, label: str, type_: str, region: str, details: Optional[Dict[str, Any]] = None, parent: Optional[str] = None) -> None:
        if not id_:
            return
        with self._lock:
            if id_ in self._nodes:
                if details:
                    self._nodes[id_]['data']['details'].update(details)
                if parent and not self._nodes[id_]['data'].get('parent'):
                    self._nodes[id_]['data']['parent'] = parent
                return
            self._nodes[id_] = { 'data': { 'id': id_, 'label': label, 'type': type_, 'region': region, 'details': details or {}, 'parent': parent } }

    def add_edge(self, id_: str, src: str, tgt: str, label: str, type_: str, category: str, derived: bool = False, details: Optional[Dict[str, Any]] = None) -> None:
        if not id_ or not src or not tgt: return
        with self._lock:
            if id_ in self._edges: return
            self._edges[id_] = { 'data': { 'id': id_, 'source': src, 'target': tgt, 'label': label, 'type': type_, 'category': category, 'derived': bool(derived), 'details': details or {} } }

    def elements(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._nodes.values()) + list(self._edges.values())
