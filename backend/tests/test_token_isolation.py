import os
import tempfile
import json
import asyncio

import httpx


def make_task(task_id: str, name: str):
    # minimal task shape matching backend normalize logic
    return {
        "id": task_id,
        "name": name,
        "estimatedTime": 25,
        "longCycle": False,
        "cycleList": [],
        "progress": 0,
        "deadline": None,
        "completed": False,
        "time_up": False,
        "urgent": False,
        "important": False,
        "description": "",
        "timestamp": 1730000000000,
    }


async def run_client_calls(app, token_a: str, token_b: str):
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1) Put one task for token A
        resp = await client.post(
            "/sync",
            headers={"Content-Type": "application/json", "X-Token": token_a},
            content=json.dumps({"tasks": [make_task("t1", "A-Task")]})
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data.get("tasks"), list)
        assert len(data["tasks"]) == 1

        # 2) Query token B (no tasks yet)
        resp_b = await client.post(
            "/sync",
            headers={"Content-Type": "application/json", "X-Token": token_b},
            content=json.dumps({"tasks": []})
        )
        assert resp_b.status_code == 200
        data_b = resp_b.json()
        assert isinstance(data_b.get("tasks"), list)
        assert len(data_b["tasks"]) == 0, "Token B should not see Token A's task"

        # 3) Query token A again (should see its task)
        resp_a2 = await client.post(
            "/sync",
            headers={"Content-Type": "application/json", "X-Token": token_a},
            content=json.dumps({"tasks": []})
        )
        assert resp_a2.status_code == 200
        data_a2 = resp_a2.json()
        assert len(data_a2["tasks"]) == 1
        assert data_a2["tasks"][0]["name"] == "A-Task"

        # 4) Insert a task for token B and ensure token A doesn't receive it
        resp_b2 = await client.post(
            "/sync",
            headers={"Content-Type": "application/json", "X-Token": token_b},
            content=json.dumps({"tasks": [make_task("t2", "B-Task")]})
        )
        assert resp_b2.status_code == 200
        data_b2 = resp_b2.json()
        assert len(data_b2["tasks"]) == 1

        resp_a3 = await client.post(
            "/sync",
            headers={"Content-Type": "application/json", "X-Token": token_a},
            content=json.dumps({"tasks": []})
        )
        assert resp_a3.status_code == 200
        data_a3 = resp_a3.json()
        assert len(data_a3["tasks"]) == 1, "Token A should not see Token B's task"


def test_token_isolation(monkeypatch):
    # Prepare temp DB and tokens file
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test.db")
        tokens_path = os.path.join(tmpdir, "tokens.txt")
        token_a = "token-A"
        token_b = "token-B"
        with open(tokens_path, "w", encoding="utf-8") as f:
            f.write(f"{token_a}\n{token_b}\n")

        # Set env before importing app
        monkeypatch.setenv("DB_PATH", db_path)
        monkeypatch.setenv("TOKEN_FILE", tokens_path)
        monkeypatch.setenv("TOKEN_REFRESH_SEC", "3600")  # avoid interfering refresh during test

        # Import server module (works when running pytest with CWD=backend)
        try:
            import server  # type: ignore
        except ModuleNotFoundError:
            # Fallback: adjust sys.path if running from repository root
            import sys, pathlib
            sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
            import server  # type: ignore

        # initialize app startup (schema + tokens)
        asyncio.get_event_loop().run_until_complete(server.startup_event())

        # run isolated scenario
        asyncio.get_event_loop().run_until_complete(
            run_client_calls(server.app, token_a, token_b)
        )
