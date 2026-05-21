import asyncio
import logging

import redpanda_connect


class YellProcessor:
    def __init__(self, prefix: str, repeat_count: int):
        self.prefix = prefix
        self.repeat_count = repeat_count

    async def process(
        self, batch: redpanda_connect.MessageBatch
    ) -> list[redpanda_connect.MessageBatch]:
        results = []
        for msg in batch:
            text = msg.payload
            if isinstance(text, bytes):
                text = text.decode("utf-8")
            msg.payload = (self.prefix + str(text).upper()) * self.repeat_count
            results.append(msg)
        return [results]

    async def close(self) -> None:
        pass


def processor(config: redpanda_connect.Value) -> YellProcessor:
    if isinstance(config, dict):
        prefix = str(config.get("prefix", ""))
        repeat_count = int(config.get("repeat_count", 1))
    else:
        prefix = ""
        repeat_count = 1
    return YellProcessor(prefix, repeat_count)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(redpanda_connect.processor_main(processor))
