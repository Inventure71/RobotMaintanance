from __future__ import annotations

from backend.execution_log_store import ExecutionLogStore


def test_execution_log_store_keeps_latest_five_logs(tmp_path):
    store = ExecutionLogStore(tmp_path, max_logs=5)

    refs = []
    for index in range(7):
        refs.append(
            store.write(
                {
                    "robotId": f"r{index}",
                    "status": "failed",
                    "job": {
                        "id": f"job-{index}",
                        "kind": "test",
                        "label": "Run tests",
                    },
                    "metadata": {"index": index},
                }
            )
        )

    files = sorted(path.name for path in tmp_path.glob("*.json"))
    latest = store.list()

    assert len(files) == 5
    assert len(latest) == 5
    assert refs[0]["file"] not in files
    assert refs[1]["file"] not in files


def test_execution_log_store_reads_payload(tmp_path):
    store = ExecutionLogStore(tmp_path, max_logs=5)
    ref = store.write(
        {
            "robotId": "r1",
            "status": "succeeded",
            "job": {
                "id": "job-1",
                "kind": "fix",
                "label": "Run fix",
            },
            "metadata": {"fixId": "flash_fix"},
        }
    )

    payload = store.read(ref["file"])

    assert payload["robotId"] == "r1"
    assert payload["job"]["kind"] == "fix"
    assert payload["metadata"]["fixId"] == "flash_fix"
