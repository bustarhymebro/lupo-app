"""Record the no-UI Lupo teaser (tools/teaser/teaser.html) to a 10s 1080x1920 mp4."""
import re
import subprocess
from pathlib import Path

import imageio_ffmpeg
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "out"
OUT.mkdir(exist_ok=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 540, "height": 960},
            record_video_dir=str(OUT),
            record_video_size={"width": 540, "height": 960},
            device_scale_factor=2,
        )
        page = ctx.new_page()
        page.goto((HERE / "teaser.html").as_uri())
        page.wait_for_timeout(14800)  # full choreography: hook → 3 forms → outro hold
        page.close()
        webm = Path(page.video.path())
        ctx.close()
        browser.close()

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    mp4 = OUT / "lupo-teaser.mp4"
    probe = subprocess.run([ffmpeg, "-i", str(webm)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", probe.stderr)
    raw_s = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 13.5
    factor = min(1.7, max(1.0, raw_s / 10.2))
    subprocess.run([
        ffmpeg, "-y", "-i", str(webm),
        "-vf", f"setpts=PTS/{factor:.3f},fps=30,scale=1080:1920:flags=lanczos",
        "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-an", str(mp4),
    ], check=True, capture_output=True)
    webm.unlink()
    for t in ("1", "4", "7", "9.5"):
        subprocess.run([ffmpeg, "-y", "-ss", t, "-i", str(mp4), "-frames:v", "1",
                        str(OUT / f"teaser-{t.replace('.', '_')}s.png")], check=True, capture_output=True)
    print(f"OK {mp4} · {mp4.stat().st_size/1e6:.1f} MB · raw {raw_s:.1f}s · x{factor:.2f}")

if __name__ == "__main__":
    main()

