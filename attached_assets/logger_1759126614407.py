import logging, pathlib
from logging.handlers import RotatingFileHandler
from config import LOG_LEVEL

def setup_logger(name=__name__):
    logger = logging.getLogger(name)
    if logger.handlers:   # already configured
        return logger

    level = getattr(logging, LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    # console
    ch = logging.StreamHandler()
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # file: logs/schwabbot.log (2MB × 3 files)
    logdir = pathlib.Path("logs"); logdir.mkdir(exist_ok=True)
    fh = RotatingFileHandler(logdir / "schwabbot.log",
                             maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    return logger
