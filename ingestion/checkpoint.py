"""
Checkpoint tracking for resumable backfills.
Uses simple JSON files to track which games/seasons have been processed.
"""

import json
from pathlib import Path
from config import CHECKPOINT_DIR
from logger import get_logger

log = get_logger("checkpoint")


class Checkpoint:
    """
    Tracks completed work so backfills can resume after interruption.

    Stores a JSON file per task type (e.g., 'game_boxscores', 'season_shots')
    with sets of completed identifiers (game_ids or season strings).
    """

    def __init__(self, name: str):
        self.name = name
        self.path = CHECKPOINT_DIR / f"{name}.json"
        self._completed: set = set()
        self._load()

    def _load(self):
        if self.path.exists():
            with open(self.path) as f:
                data = json.load(f)
                self._completed = set(data.get("completed", []))
            log.info(f"Checkpoint '{self.name}': loaded {len(self._completed)} completed items")

    def _save(self):
        with open(self.path, "w") as f:
            json.dump({"completed": sorted(self._completed)}, f)

    def is_done(self, item_id: str) -> bool:
        return item_id in self._completed

    def mark_done(self, item_id: str):
        self._completed.add(item_id)
        # Save every time so we never lose progress
        self._save()

    def mark_batch_done(self, item_ids: list[str]):
        self._completed.update(item_ids)
        self._save()

    @property
    def completed_count(self) -> int:
        return len(self._completed)

    def reset(self):
        """Clear all progress. Use with caution."""
        self._completed.clear()
        self._save()
        log.info(f"Checkpoint '{self.name}': reset")
