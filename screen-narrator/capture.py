"""Captura de pantalla y detección de cambios."""
import io

import mss
from PIL import Image, ImageChops, ImageStat


class ScreenGrabber:
    def __init__(self, monitor_index: int = 1, max_width: int = 1280, jpeg_quality: int = 70):
        self.sct = mss.mss()
        if not 0 <= monitor_index < len(self.sct.monitors):
            raise ValueError(
                f"Monitor {monitor_index} no existe. Disponibles: 1..{len(self.sct.monitors) - 1} "
                "(0 = todos los monitores juntos). Usa --list-monitors."
            )
        self.monitor = self.sct.monitors[monitor_index]
        self.max_width = max_width
        self.jpeg_quality = jpeg_quality

    def grab(self) -> Image.Image:
        shot = self.sct.grab(self.monitor)
        img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
        if img.width > self.max_width:
            height = round(img.height * self.max_width / img.width)
            img = img.resize((self.max_width, height), Image.LANCZOS)
        return img

    def to_jpeg(self, img: Image.Image) -> bytes:
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=self.jpeg_quality)
        return buf.getvalue()


def list_monitors() -> list[str]:
    with mss.mss() as sct:
        return [
            f"{i}: {m['width']}x{m['height']} en ({m['left']},{m['top']})"
            + ("  [todos juntos]" if i == 0 else "")
            for i, m in enumerate(sct.monitors)
        ]


def change_score(a: Image.Image, b: Image.Image) -> float:
    """Diferencia media (0-255) entre dos imágenes, comparadas en miniatura gris."""
    size = (64, 36)
    ta = a.convert("L").resize(size)
    tb = b.convert("L").resize(size)
    return ImageStat.Stat(ImageChops.difference(ta, tb)).mean[0]
