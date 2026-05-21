import asyncio
import logging

import redpanda_connect


@redpanda_connect.processor
def yell(msg: redpanda_connect.Message) -> redpanda_connect.Message:
    text = msg.payload
    if isinstance(text, bytes):
        text = text.decode("utf-8")
    msg.payload = str(text).upper()
    return msg


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(redpanda_connect.processor_main(yell))
